var gulp = require('gulp');
var eslint = require('gulp-eslint');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var del = require('del');
var gi = require('gulp-if');
var codacy = require('gulp-codacy');
var sequence = require('gulp-sequence');
var run = require('./');

gulp.task('clean', ['clean.dist']);

gulp.task('clean.dist', function cleanDistTask() {
  return del(['dist/**', '!dist/.gitignore']);
});

gulp.task('test.instrument', function instrumentTask() {
  return gulp
    .src(['command.js', 'index.js'])
    .pipe(istanbul({
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire())
  ;
});

gulp.task('test', ['test.instrument'], function testTask() {
  process.env.NODE_ENV = 'test';

  return gulp
    .src(['test/**/*.test.js'])
    .pipe(mocha({
      require: ['should']
    }))
    .pipe(istanbul.writeReports({
      dir: './dist/test-report'
    }))
    .pipe(istanbul.enforceThresholds({
      thresholds: { global: 50 }
    }))
  ;
});

gulp.task('lint', function lintTask() {
  return gulp
    .src([
      'index.js',
      'gulpfile.js',
      'lib/**/*.js',
      'test/**/*.js'
    ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError())
  ;
});

gulp.task('codacy', function codacyTask() {
  return gulp
    .src(['dist/test-report/lcov.info'], { read: false })
    .pipe(gi(process.env.CODACY, codacy({
      token: process.env.CODACY
    })))
  ;
});

gulp.task('example', function exampleTask() {
  return gulp.src('README.md')
    .pipe(run('awk "NR % 2 == 0"'))
    .pipe(run('sed -n 1,4p'))
    .pipe(gulp.dest('dist'))
  ;
});

gulp.task('default', sequence('lint', 'test', 'codacy'));
