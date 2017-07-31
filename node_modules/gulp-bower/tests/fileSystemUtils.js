var fs = require('fs');
var rimraf = require('rimraf');

var BOWERJSON = 'bower.json';

/**
 * Copy file
 *
 * @param {string} source path to source file
 * @param {string} target path to destination file
 * @param {Function} cb done callback
 */
function copyFile(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", function (err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function (err) {
        done(err);
    });
    wr.on("close", function (ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (typeof cb === "function") {
            cb(err);
            cbCalled = true;
        }
    }
}

/**
 * Write version conflicting bower.json to file
 * 
 * @param {Function} done done callback
 */
function writeConflictJson(done) {
    copyFile('./tests/fixtures/bowerConflict.json', BOWERJSON, done);
}

/**
 * Write valid bower.json to file
 * 
 * @param {Function} done done callback
 */
function writeValidJson(done) {
    copyFile('./tests/fixtures/bowerValid.json', BOWERJSON, done);
}

/**
 * Write valid .bowerrc to file
 * 
 * @param {Function} done done callback
 */
function writeValidBowerrc(done) {
    copyFile('./tests/fixtures/bowerrcValid.json', './.bowerrc', done);
}

/**
 * Write empty .bowerrc to file
 * 
 * @param {Function} done done callback
 */
function writeEmptyBowerrc(done) {
    copyFile('./tests/fixtures/bowerrcEmpty.json', './.bowerrc', done);
}

/**
 * Delete bower_components
 *
 * @param {string} path path to file or directory to delete
 * @param {Function} done done callback
 */
function deletePath(path, done) {
    rimraf(path, function (err) {
        if (err) throw (err);
        if (typeof done === 'function') done();
    });
}

/**
 * Delete bower.json if it exists
 *
 * @param {Function} done done callback
 */
function deleteBowerJson(done) {
    fs.stat(BOWERJSON, function (err, stats) {
        if (err) return done();

        fs.unlink(BOWERJSON, function (err) {
            if (err) throw err;
            if (typeof done === 'function') done();
        });
    })
}

module.exports = {
    writeConflictJson: writeConflictJson,
    writeValidJson: writeValidJson,
    writeValidBowerrc: writeValidBowerrc,
    writeEmptyBowerrc: writeEmptyBowerrc,
    deletePath: deletePath,
    deleteBowerJson: deleteBowerJson
};
