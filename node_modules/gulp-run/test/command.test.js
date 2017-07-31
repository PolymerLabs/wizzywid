var path = require('path');
var Command = require('../command');

describe('gulp-run/command', function commandTestCase() {
  describe('#constructor', function constructorTestCase() {
    it('merges the passed options', function passOptionsTest() {
      var options = {
        cwd: path.resolve(__dirname),
        env: {
          PATH: path.resolve(path.join(__dirname, '_resource'))
        },
        verbosity: 3,
        usePowerShell: false
      };

      var command = new Command('', options);
      command.options.should.eql(options);
    });

    it('takes care of options.silent', function silentTest() {
      var command = new Command('', { silent: true });
      command.options.verbosity.should.equal(1);
    });

    it('uses the default options', function defaultOptionsTest() {
      var command = new Command('');
      command.options.should.be.an.Object();
    });
  });
});
