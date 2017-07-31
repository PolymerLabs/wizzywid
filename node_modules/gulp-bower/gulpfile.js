/* jshint node:true */
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var codecov = require('gulp-codecov.io');

gulp.task('lint', function () {
    return gulp.src(['index.js', 'tests/test.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
});

gulp.task('coverage-setup', function () {
    return gulp.src('index.js')
        .pipe(istanbul())
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['coverage-setup'], function () {
    return gulp.src('tests/test.js', { read: false })
        .pipe(mocha({ reporter: 'spec', timeout: 15000 }))
        .pipe(istanbul.writeReports());
});

gulp.task('post-coverage', ['test'], function () {
    return gulp.src('./coverage/lcov.info')
        .pipe(codecov());
});

gulp.task('watch-test', function () {
    gulp.watch(['index.js', 'tests/test.js'], ['test']);
});

gulp.task('default', ['lint']);
