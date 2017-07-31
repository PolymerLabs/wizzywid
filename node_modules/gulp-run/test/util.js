var Stream = require('stream');

/**
 * Returns a no-op function. If a callback is given, it is called when the
 * returned function is called. This is useful for wrapping functions to ignore
 * arguments.
 * @param  {function} callback
 * @return {function}
 */
module.exports.noop = function noop(callback) {
  if (typeof callback !== 'function') {
    callback = function() {};
  }

  return function() {
    callback();
  };
};

/**
 * Constructs an async-semaphore that calls back when semaphore#done()
 * has been called a given number of times.
 *
 * @param  {number}   count
 * @param  {function} callback
 * @return {Semaphore}
 */
module.exports.Semaphore = function Semaphore(count, callback) {
  this.done = function done() {
    count -= 1;
    return (count <= 0) ? callback() : this;
  };

  return this;
};

/**
 * Returns a pass-through Vinyl stream that throws an error if the contents of
 * the incoming file doesn't match a pattern.
 *
 * @param  {string|RegExp} match
 * @return {Stream}
 */
module.exports.compare = function compare(match) {
  var stream;

  if (!(match instanceof RegExp)) {
    match = new RegExp('^' + match.toString() + '$');
  }

  stream = new Stream.Transform({
    objectMode: true
  });

  stream._transform = function _transform(file, encoding, callback) {
    var contents;
    var clonedFile;

    if (file.isStream()) {
      clonedFile = file.clone();
      clonedFile.contents = new Stream.Transform();
      clonedFile.contents._transform = function _clonedFileTransform(chunk, __, next) {
        clonedFile.contents.push(chunk);
        return next();
      };

      contents = '';
      file.contents.on('readable', function handleReadable() {
        var chunk;

        function loop() {
          chunk = file.contents.read();
          if (chunk) {
            contents += chunk;
            loop();
          }
        }

        loop();
      });

      file.contents.on('end', function handleEnd() {
        contents.should.match(match);

        clonedFile.contents.push(contents);
        clonedFile.contents.end();
        stream.push(clonedFile);

        process.nextTick(callback);
      });

      return;
    }

    contents = (file.isBuffer()) ? file.contents.toString() : file.contents;
    contents.should.match(match);

    stream.push(file);

    process.nextTick(callback);

    return;
  };

  return stream;
};

/**
 * Returns a pass-through Vinyl stream that allows us to inspect the file
 *
 * @param  {function} callback
 * @return {Stream}
 */
module.exports.inspect = function inspect(callback) {
  var stream = new Stream.Transform({
    objectMode: true
  });

  stream._transform = function _transform(file, enc, next) {
    callback(file);
    stream.push(file);

    next();
  };

  return stream;
};
