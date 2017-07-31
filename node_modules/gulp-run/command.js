var cp = require('child_process');
var path = require('path');
var stream = require('stream');
var util = require('util');
var defaults = require('lodash.defaults');
var applyTemplate = require('lodash.template');
var Vinyl = require('vinyl');
var gutil = require('gulp-util');

/**
 * Creates a new `gulp-run` command.
 *
 * @param {string} command
 * @param {object} options
 */
function Command(command, options) {
  var previousPath;

  this.command = command;

  // We're on Windows if `process.platform` starts with "win", i.e. "win32".
  this.isWindows = (process.platform.lastIndexOf('win') === 0);

  // the cwd and environment of the command are the same as the main node
  // process by default.
  this.options = defaults(options || {}, {
    cwd: process.cwd(),
    env: process.env,
    verbosity: (options && options.silent) ? 1 : 2,
    usePowerShell: false
  });

  // include node_modules/.bin on the path when we execute the command.
  previousPath = this.options.env.PATH;
  this.options.env.PATH = path.join(this.options.cwd, 'node_modules', '.bin');
  this.options.env.PATH += path.delimiter;
  this.options.env.PATH += previousPath;
}

/**
 * Execute the command, invoking the callback when the command exits.
 * Returns a Vinyl file wrapping the command's stdout.
 *
 * @param  {string}   stdin
 * @param  {function} callback
 * @return {Stream}
 */
Command.prototype.exec = function exec(stdin, callback) {
  var self = this;
  var command;
  var fileName;
  var directory;
  var subShell;
  var log;
  var err;
  var stdout;

  // parse the arguments, both are optional.
  // after parsing, stdin is a vinyl file to use as standard input to
  // the command (possibly empty), and callback is a function.
  if (typeof stdin === 'function') {
    callback = stdin;
    stdin = undefined;
  } else if (typeof callback !== 'function') {
    callback = function noop() {};
  }

  if (!(stdin instanceof Vinyl)) {
    fileName = this.command.split(' ')[0];
    directory = path.join(this.options.cwd, fileName);

    if (typeof stdin === 'string') {
      stdin = new Vinyl({
        path: directory,
        contents: new Buffer(stdin)
      });
    } else if (stdin instanceof Buffer || stdin instanceof stream.Readable) {
      stdin = new Vinyl({
        path: directory,
        contents: stdin
      });
    } else {
      stdin = new Vinyl(stdin);

      if (!stdin.path) {
        stdin.path = directory;
      }
    }
  }

  // execute the command.
  // we spawn the command in a subshell, so things like i/o redirection
  // just work. e.g. `echo hello world >> ./hello.txt` works as expected.
  command = applyTemplate(this.command)({
    file: stdin
  });

  if (this.isWindows && this.options.usePowerShell) {
    // windows powershell
    subShell = cp.spawn('powershell.exe', ['-NonInteractive', '-NoLogo', '-Command', command], {
      env: this.options.env,
      cwd: this.options.cwd
    });
  } else if (this.isWindows) {
    // windows cmd.exe
    subShell = cp.spawn('cmd.exe', ['/c', command], {
      env: this.options.env,
      cwd: this.options.cwd
    });
  } else {
    // POSIX shell
    subShell = cp.spawn('sh', ['-c', command], {
      env: this.options.env,
      cwd: this.options.cwd
    });
  }

  // setup the output
  //
  // - if verbosity equals to 3, the command prints directly to the terminal.
  // - if verbosity equals to 2, the command's stdout and stderr are buffered
  //   and printed to the user's terminal after the command exits (this
  //   prevents overlaping output of multiple commands)
  // - if verbosity equals to 1, the command's stderr is buffered as in 2, but
  //   the stdout is silenced.
  log = new stream.PassThrough();

  function sendLog(context) {
    var title = util.format(
      '$ %s%s',
      gutil.colors.blue(command),
      (self.options.verbosity < 2) ? gutil.colors.grey(' # Silenced\n') : '\n'
    );

    context.write(title);
  }

  switch (this.options.verbosity) {
    case 3:
      sendLog(process.stdout);
      subShell.stdout.pipe(process.stdout);
      subShell.stderr.pipe(process.stderr);
      break;
    case 2:
      subShell.stdout.pipe(log);
      // fallthrough
    case 1:
      subShell.stderr.pipe(log);
      sendLog(log);
      break;
  }

  // setup the cleanup proceedure for when the command finishes.
  subShell.once('close', function handleSubShellClose() {
    // write the buffered output to stdout
    var content = log.read();

    if (content !== null) {
      process.stdout.write(content);
    }
  });

  subShell.once('exit', function handleSubShellExit(code) {
    // report an error if the command exited with a non-zero exit code.
    if (code !== 0) {
      err = new Error(util.format('Command `%s` exited with code %s', command, code));
      err.status = code;

      return callback(err);
    }

    callback(null);
  });

  // the file wrapping stdout is as the one wrapping stdin (same metadata)
  // with different contents.
  stdout = stdin.clone();
  stdout.contents = subShell.stdout.pipe(new stream.PassThrough());

  // finally, write the input to the process's stdin.
  stdin.pipe(subShell.stdin);

  return stdout;
};

/**
 * Returns the command template.
 *
 * @return {string}
 */
Command.prototype.toString = function toString() {
  return this.command;
};

module.exports = Command;
