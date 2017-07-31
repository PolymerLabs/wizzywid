/* global describe, xdescribe, it, xit, before, beforeEach, afterEach, after, process */
/* jshint expr: true */

var streamAssert = require('stream-assert');
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var inquirer = require('inquirer');
var gutil = require('gulp-util');
var fs = require('fs');

var fsUtil = require('./fileSystemUtils');
var bower = require('../index.js');

describe('gulp-bower', function () {
    var consoleStub;
    var consoleOutput = '';

    before(function () {
        chai.use(sinonChai);
    });

    beforeEach(function (done) {
        fsUtil.deletePath('bower_components/', function () {
            fsUtil.deleteBowerJson(function () {
                fsUtil.deletePath('.bowerrc', done);
            });
        });

        // stub gutil.log to suppress output in test results
        consoleStub = sinon.stub(gutil, 'log', function (val) {
            consoleOutput += val + '\n';
        });
    });

    afterEach(function () {
        gutil.log.restore();
    });

    it('should emit error when dependency version can\'t be resolved', function (done) {
        fsUtil.writeConflictJson(function () {
            bower()
                .on('error', function (error) {
                    try {
                        expect(error.message).to.match(/resolve.*dependency/);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });
    });

    it('should pipe files to stream', function (done) {
        fsUtil.writeValidJson(function () {
            bower()
                .pipe(streamAssert.end(done));
        });
    });

    describe('option', function () {
        describe('cmd', function () {
            it('should throw error on unknown command', function () {
                var command = 'notValidCommand';
                expect(function () {
                    bower({ cmd: command });
                }).to.throw(/notValidCommand/);
            });

            it('should handle multi letter commands', function () {
                var command = 'cache clean';
                expect(function () {
                    bower({ cmd: command, verbosity: 2 });
                }).to.not.throw();
            });
        });

        describe('directory', function () {
            it('should write to default directory', function (done) {
                fsUtil.writeValidJson(function () {
                    bower()
                        .on('end', function () {
                            fs.stat('bower_components', function (err, stats) {
                                expect(err).to.not.exist;
                                done();
                            });
                        });
                });
            });

            it('should write to explicit directory', function (done) {
                fsUtil.writeValidJson(function () {
                    bower({ directory: 'lib' })
                        .on('end', function () {
                            fs.stat('lib', function (err, stats) {
                                expect(err).to.not.exist;
                                fsUtil.deletePath('lib/', done);
                            });
                        });
                });
            });

            it('should write to explicit directory from string argument', function (done) {
                fsUtil.writeValidJson(function () {
                    bower('lib')
                        .on('end', function () {
                            fs.stat('lib', function (err, stats) {
                                expect(err).to.not.exist;
                                fsUtil.deletePath('lib/', done);
                            });
                        });
                });
            });

            it('should use default directory when .bowerrc is empty', function (done) {
                fsUtil.writeValidJson(function () {
                    fsUtil.writeEmptyBowerrc(function () {
                        bower()
                            .on('end', function () {
                                fs.stat('bower_components', function (err, stats) {
                                    expect(err).to.not.exist;
                                    fsUtil.deletePath('.bowerrc', done);
                                });
                            });
                    });
                });
            });

            it('should get directory from .bowerrc', function (done) {
                fsUtil.writeValidJson(function () {
                    fsUtil.writeValidBowerrc(function () {
                        bower()
                            .on('end', function () {
                                fs.stat('bowerrc_components', function (err, stats) {
                                    expect(err).to.not.exist;
                                    fsUtil.deletePath('bowerrc_components/', function () {
                                        fsUtil.deletePath('.bowerrc', done);
                                    });
                                });
                            });
                    });
                });
            });
        });

        describe('interactive', function () {
            var promptStub;
            beforeEach(function () {
                // select first option when prompting
                promptStub = sinon.stub(inquirer, 'prompt', function (questions, cb) {
                    setTimeout(function () {
                        cb({
                            prompt: '1'
                        }, 0);
                    });
                });
            });

            afterEach(function () {
                inquirer.prompt.restore();
            });

            it('should prompt for action when interactive is true', function (done) {
                fsUtil.writeConflictJson(function () {
                    bower({ interactive: true })
                        .once('end', function () {
                            try {
                                expect(promptStub).to.have.been.called;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });

            it('should not emit error when dependency version can\'t be resolved and interactive is true', function (done) {
                fsUtil.writeConflictJson(function () {
                    var error = false;
                    bower({ interactive: true })
                        .once('error', function () {
                            error = true;
                        })
                        .once('end', function () {
                            try {
                                expect(error).to.be.false;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });
        });

        describe('verbosity', function () {
            it('should output nothing when verbosity is 0', function (done) {
                fsUtil.writeValidJson(function () {
                    bower({ verbosity: 0 })
                        .on('end', function () {
                            try {
                                expect(consoleStub).to.not.have.been.called;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });

            it('should output nothing on errors when verbosity is 0', function (done) {
                fsUtil.writeConflictJson(function () {
                    bower({ verbosity: 0 })
                        .on('error', function () {
                            try {
                                expect(consoleStub).to.not.have.been.called;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });

            it('should output errors when verbosity is 1', function (done) {
                fsUtil.writeConflictJson(function () {
                    bower({ verbosity: 1 })
                        .on('error', function () {
                            try {
                                expect(consoleStub).to.have.been.called;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });

            it('should output info when verbosity is 2', function (done) {
                fsUtil.writeValidJson(function () {
                    bower({ verbosity: 2 })
                        .on('end', function () {
                            try {
                                expect(consoleStub).to.have.been.called;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                });
            });
        });
    });
});
