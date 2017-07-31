/* eslint no-loop-func: 0 */

var path = require('path');
var gulp = require('gulp');
var rename = require('gulp-rename');
var run = require('../');
var util = require('./util');

describe('gulp-run', function gulpRunTestCase() {
  var inputFileName = path.join(__dirname, '_resource/input.txt');

  it('includes `node_modules/.bin` on the PATH', function includeNodeModulesTest(done) {
    var nodeModulesPath = path.join(__dirname, '..', 'node_modules', '.bin');

    run('echo $PATH', { verbosity: 0 }).exec()
      .pipe(util.compare(new RegExp('^' + nodeModulesPath)))
      .on('finish', done)
    ;
  });

  it('lets you set the initial cwd of the command', function cwdTest(done) {
    run('pwd', { cwd: '/', verbosity: 0 }).exec()
      .pipe(util.compare('/\n'))
      .on('finish', done)
    ;
  });

  describe('in a vinyl pipeline', function vinylPipelineTestCase() {
    it('works with buffers', function bufferTest(done) {
      // use awk to extract the even lines of a file
      gulp.src(inputFileName, { buffer: true })
        .pipe(run('awk "NR % 2 == 0"', {
          verbosity: 0
        }))
        .pipe(util.compare('2\n4\n6\n8\n10\n12\n'))
        .on('finish', done)
      ;
    });

    it('works with streams', function streamTest(done) {
      // use awk to extract the even lines of a file
      gulp.src(inputFileName, { buffer: false })
        .pipe(run('awk "NR % 2 == 0"', {
          verbosity: 0
        }))
        .pipe(util.compare('2\n4\n6\n8\n10\n12\n'))
        .on('finish', done)
      ;
    });

    it('supports command templates, i.e. `echo <%= file.path %>`', function templateTest(done) {
      gulp.src(inputFileName)
        .pipe(run('echo <%= file.path %>', {
          verbosity: 0
        }))
        .pipe(util.compare(inputFileName + '\n'))
        .on('finish', done)
      ;
    });

    it('emits an `error` event on a failed command', function errorTest(done) {
      gulp.src(inputFileName)
        .pipe(run('exit 1', { verbosity: 0 }))
        .on('error', util.noop(done))
      ;
    });

    it('maintains metadata of incoming file', function metaDataTest(done) {
      gulp.src(inputFileName)
        .pipe(util.inspect(function handleInspect(file) {
          file.custom = 'custom metadata';
        }))
        .pipe(run('cat', {
          verbosity: 0
        }))
        .pipe(util.inspect(function captureInspect(file) {
          file.custom.should.equal('custom metadata');
        }))
        .on('finish', done)
      ;
    });
  });

  describe('direct execution (`.exec`)', function execTestCase() {
    it('is asynchronous (this test sleeps for 1s)', function asyncTest(done) {
      var semaphore = new util.Semaphore(2, done);
      var startTime = process.hrtime()[0];
      var index;

      for (index = 0; index < 2; index += 1) {
        run('sleep 1', { verbosity: 0 })
          .exec(function handleExec() {
            var delta = process.hrtime()[0] - startTime;
            delta.should.equal(1);
            semaphore.done();
          })
        ;
      }
    });

    it('returns a vinyl stream wrapping stdout', function wrappingStdOutTest(done) {
      run('echo Hello World', { verbosity: 0 })
        .exec()
        .pipe(util.compare('Hello World\n'))
        .on('finish', done)
      ;
    });

    it('emits an `error` event on a failed command', function emitErrorTest(done) {
      run('exit 1', { verbosity: 0 })
        .exec()
        .on('error', util.noop(done))
      ;
    });

    it('closes the stream when done', function streamCloseTest(done) {
      run('echo Hello World', { verbosity: 0 })
        .exec()
        .on('finish', done)
      ;
    });
  });

  describe('issues', function issuesTestCase() {
    it('#18 - file names and paths', function issue18(done) {
      run('echo hello world', { cwd: './', verbosity: 0 }).exec()
        .pipe(rename('dest.txt'))
        .on('finish', done)
      ;
    });

    it('#35 - no callback if command not found', function commandNotFoundTest(done) {
      run('nonexistant', { verbosity: 0 })
        .exec()
        .on('error', function handleError() {
          done();
        })
      ;
    });
  });
});
