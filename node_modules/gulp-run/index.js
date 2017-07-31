/**
 * Pipe shell commands in gulp.
 * @module gulp-run
 */

var inherit = require('util').inherits;
var Transform = require('stream').Transform;
var Command = require('./command');

/**
 * Creates a GulpRunner.
 *
 * A GulpRunner is a Vinyl transform stream that spawns a child process to
 * transform the file. A separate process is spawned to handle each file
 * passing through the stream.
 *
 * @param {string} template
 * @param {object} options
 */
function GulpRunner(template, options) {
  if (!(this instanceof GulpRunner)) {
    return new GulpRunner(template, options);
  }

  this.command = new Command(template, options || {});
  Transform.call(this, { objectMode: true });
}

/**
 * @extends {Stream.Transform}
 */
inherit(GulpRunner, Transform);

/**
 * @param  {string}   file
 * @param  {string}   encoding
 * @param  {function} callback
 * @return {void}
 */
GulpRunner.prototype._transform = function _transform(file, encoding, callback) {
  var newfile = this.command.exec(file, callback);
  this.push(newfile);
};

/**
 * Writes `stdin` to itself and returns itself.
 *
 * Whenever an object is written into the GulpRunner, a new process is
 * spawned taking that data as standard input, and a Vinyl file wrapping the
 * process's standard output is pushed downstream.
 *
 * `stdin` may be a String, Buffer, Readable stream, or Vinyl file.
 *
 * @param  {mixed}   stdin
 * @param  {function} callback
 * @return {GulpRunner}
 */
GulpRunner.prototype.exec = function exec(stdin, callback) {
  this.write(stdin, callback);
  this.end();
  return this;
};

/**
 * @static
 * @type {Command}
 */
GulpRunner.Command = Command;

module.exports = GulpRunner;
