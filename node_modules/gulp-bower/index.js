/* global process */
var bower = require('bower');
var fs = require('fs');
var gutil = require('gulp-util');
var path = require('path');
var through = require('through2');
var walk = require('walk');
var inquirer = require('inquirer');

var toString = {}.toString,
    enablePrompt,
    cmd;

var PLUGIN_NAME = 'gulp-bower',
    DEFAULT_VERBOSITY = 2,
    DEFAULT_CMD = 'install',
    DEFAULT_DIRECTORY = './bower_components',
    DEFAULT_INTERACTIVE = false;

/*
 * Verbosity levels:
 * 0: No output
 * 1: Error output
 * 2: All output
 */
var log = {
    verbosity: DEFAULT_VERBOSITY,
    info: function (s) {
        if (this.verbosity > 1) {
            log.output(s);
        }
    },
    error: function (s) {
        if (this.verbosity > 0) {
            log.output(gutil.colors.red(s));
        }
    },
    output: function (s) {
        gutil.log(s);
    }
};

/**
 * Gulp bower plugin
 *
 * @param {(object | string)} opts options object or directory string, see opts.directory
 * @param {string} opts.cmd bower command (default: install)
 * @param {string} opts.cwd current working directory (default: process.cwd())
 * @param {string} opts.directory bower components directory (default: .bowerrc config or 'bower_components')
 * @param {boolean} opts.interactive enable prompting from bower (default: false)
 * @param {number} opts.verbosity set logging level from 0 (no output) to 2 for info (default: 2)
 */
function gulpBower(opts, cmdArguments) {
    opts = parseOptions(opts);

    log.info('Using cwd: ' + opts.cwd);
    log.info('Using bower dir: ' + opts.directory);

    cmdArguments = createCmdArguments(cmdArguments, opts);
    var bowerCommand = getBowerCommand(cmd);

    var stream = through.obj(function (file, enc, callback) {
        this.push(file);
        callback();
    });

    bowerCommand.apply(bower.commands, cmdArguments)
        .on('log', function (result) {
            log.info(['bower', gutil.colors.cyan(result.id), result.message].join(' '));
        })
        .on('prompt', function (prompts, callback) {
            if (enablePrompt === true) {
                inquirer.prompt(prompts, callback);
            } else {
                var error = 'Can\'t resolve suitable dependency version.';
                log.error(error);
                log.error('Set option { interactive: true } to select.');
                throw new gutil.PluginError(PLUGIN_NAME, error);
            }
        })
        .on('error', function (error) {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
            stream.emit('end');
        })
        .on('end', function () {
            writeStreamToFs(opts, stream);
        });

    return stream;
}

/**
 * Parse plugin options
 *
 * @param {object | string} opts options object or directory string
 */
function parseOptions(opts) {
    opts = opts || {};
    if (toString.call(opts) === '[object String]') {
        opts = {
            directory: opts
        };
    }

    opts.cwd = opts.cwd || process.cwd();

    log.verbosity = toString.call(opts.verbosity) === '[object Number]' ? opts.verbosity : DEFAULT_VERBOSITY;
    delete (opts.verbosity);

    cmd = opts.cmd || DEFAULT_CMD;
    delete (opts.cmd);

    // enable bower prompting but ignore the actual prompt if interactive == false
    enablePrompt = opts.interactive || DEFAULT_INTERACTIVE;
    opts.interactive = true;

    if (!opts.directory) {
        opts.directory = getDirectoryFromBowerRc(opts.cwd) || DEFAULT_DIRECTORY;
    }

    return opts;
}

/**
 * Detect .bowerrc file and read directory from file
 *
 * @param {string} cwd current working directory
 * @returns {string} found directory or empty string
 */
function getDirectoryFromBowerRc(cwd) {
    var bowerrc = path.join(cwd, '.bowerrc');

    if (!fs.existsSync(bowerrc)) {
        return '';
    }

    var bower_config = {};
    try {
        bower_config = JSON.parse(fs.readFileSync(bowerrc));
    } catch (err) {
        return '';
    }

    return bower_config.directory;
}

/**
 * Create command arguments
 *
 * @param {any} cmdArguments
 * @param {object} opts options object
 */
function createCmdArguments(cmdArguments, opts) {
    if (toString.call(cmdArguments) !== '[object Array]') {
        cmdArguments = [];
    }
    if (toString.call(cmdArguments[0]) !== '[object Array]') {
        cmdArguments[0] = [];
    }
    cmdArguments[1] = cmdArguments[1] || {};
    cmdArguments[2] = opts;

    return cmdArguments;
}

/**
 * Get bower command instance
 *
 * @param {string} cmd bower commands, e.g. 'install' | 'update' | 'cache clean' etc.
 * @returns {object} bower instance initialised with commands
 */
function getBowerCommand(cmd) {
    // bower has some commands that are provided in a nested object structure, e.g. `bower cache clean`.
    var bowerCommand;

    // clean up the command given, to avoid unnecessary errors
    cmd = cmd.trim();

    var nestedCommand = cmd.split(' ');

    if (nestedCommand.length > 1) {
        // To enable that kind of nested commands, we try to resolve those commands, before passing them to bower.
        for (var commandPos = 0; commandPos < nestedCommand.length; commandPos++) {
            if (bowerCommand) {
                // when the root command is already there, walk into the depth.
                bowerCommand = bowerCommand[nestedCommand[commandPos]];
            } else {
                // the first time we look for the "root" commands available in bower
                bowerCommand = bower.commands[nestedCommand[commandPos]];
            }
        }
    } else {
        // if the command isn't nested, just go ahead as usual
        bowerCommand = bower.commands[cmd];
    }

    // try to give a good error description to the user when a bad command was passed
    if (bowerCommand === undefined) {
        throw new gutil.PluginError(PLUGIN_NAME, 'The command \'' + cmd + '\' is not available in the bower commands');
    }

    return bowerCommand;
}

/**
 * Write stream to filesystem
 * 
 * @param {object} opts options object
 * @param {object} stream file stream
 */
function writeStreamToFs(opts, stream) {
    var baseDir = path.join(opts.cwd, opts.directory);
    var walker = walk.walk(baseDir);

    walker.on('errors', function (root, stats, next) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, stats.error));
        next();
    });
    walker.on('directory', function (root, stats, next) {
        next();
    });

    walker.on('file', function (root, stats, next) {
        var filePath = path.resolve(root, stats.name);

        fs.readFile(filePath, function (error, data) {
            if (error) {
                stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
            } else {
                stream.write(new gutil.File({
                    path: path.relative(baseDir, filePath),
                    contents: data
                }));
            }

            next();
        });
    });

    walker.on('end', function () {
        stream.emit('end');
    });
}

module.exports = gulpBower;
