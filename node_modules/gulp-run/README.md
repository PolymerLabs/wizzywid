# gulp-run
[![Codacy Badge](https://api.codacy.com/project/badge/grade/c40b0223c6314a1ebab8d0024cfd1d41)](https://www.codacy.com/app/mrboolean/gulp-run)

Use shell commands in your gulp or vinyl pipeline.

Many command line interfaces are built around the idea of piping. Let's take advantage of that in our Gulp pipeline! To use gulp-run, simply tell it the command to process your files; gulp-run accepts any command you could write into your shell, including I/O redirection like ` python < baz.py | cat foo.txt - bar.txt`. Additionally, `node_modules/.bin` is included on the path, so you can call programs supplied by your installed packages. Supports Unix and Windows.

This plugin is inspired by [gulp-shell] and [gulp-spawn] and attempts to improve upon their great work.

## Usage

```javascript
var run = require('gulp-run');

// use gulp-run to start a pipeline
gulp.task('hello-world', function() {
  return run('echo Hello World').exec()    // prints "Hello World\n".
    .pipe(gulp.dest('output'))      // writes "Hello World\n" to output/echo.
  ;
})


// use gulp-run in the middle of a pipeline:
gulp.task('even-lines', function() {
  return gulp
    .src('path/to/input/*')             // get input files.
    .pipe(run('awk "NR % 2 == 0"'))     // use awk to extract the even lines.
    .pipe(gulp.dest('path/to/output'))  // profit.
  ;
});

// use gulp-run without gulp
var cmd = new run.Command('cat');  // create a command object for `cat`.
cmd.exec('hello world');           // call `cat` with 'hello world' on stdin.
```

## API
### `run(template, [options])`
Creates a Vinyl (gulp) stream that transforms its input by piping it to a shell command.

See <a href="#run.Command">`run.Command`</a> for a description of the arguments.

#### Returns
*(stream.Transform in Object Mode)*: Returns a Transform stream that receives Vinyl files. For each input, a subprocess is started taking the contents of the input on stdin. A new file is pushed downstream containing the process's stdout.

#### Example
```javascript
gulp.task('even-lines', function() {
  return gulp
    .src('path/to/input/*')             // get input files.
    .pipe(run('awk "NR % 2 == 0"'))     // use awk to extract the even lines.
    .pipe(gulp.dest('path/to/output'))  // profit.
  ;
})
```

---

### `run(...).exec([stdin], [callback])`
Start a gulp pipeline and execute the command immediately, pushing the results downstream.

#### Arguments
1. `[stdin]` *(String | Buffer | Vinyl)*: If given, this will be used as stdin for the command.
1. `[callback]` *(Function)*: The callback is called once the command has exited. An Error is passed if the exit status was non-zero. The error will have a `status` property set to the exit status.

#### Returns
*(Stream.Readable in Object Mode)*: Returns a Vinyl (gulp) stream which will push downstream the stdout of the command as a Vinyl file. The default path of the Vinyl file is the first word of the template; use [gulp-rename] for more versatility.

#### Example
```javascript
gulp.task('hello-world', function() {
  return run('echo Hello World').exec()  // prints "[echo] Hello World\n".
    .pipe(gulp.dest('output'))           // writes "Hello World\n" to output/echo.
  ;
})
```

---

<a name="run.Command"></a>
### `new run.Command(template, [options])`
Represents a command to be run in a subshell.

#### Arguments
1. `template` *(String)*: The command to run. It can be a [template] interpolating the variable `file` which references the [Vinyl] file being input. The template need not interpolate anything; a simple shell command will do just fine. The command is passed as an argument to `sh -c`, so I/O redirection and the like will work as you would expect from a terminal.
1. `options` *(Object)*:
    - `env` *(Object)*: The environmental variables for the child process. Defaults to `process.env`.
    - `cwd` *(String)*: The initial working directory for the child process. Defaults to `process.cwd()`.
    - `silent` *(Boolean)*: If true, do not print the command's output. This is the same as setting verbosity to 1. Defaults to false.
    - `verbosity` *(Number)*: Sets the verbosity level. Defaults to `2`.
        - `0`: Do not print anything, ever.
        - `1`: Print the command being run and its stderr.
        - `2`: Print the command, its stderr, and its stdout.
        - `3`: Print the command, its stderr, and its stdout progressivly. Not useful if you have concurrent gulp-run instances, as the outputs may get mixed.
    - `usePowerShell` *(Boolean)*: *Windows only*. If `true` uses the PowerShell instead of `cmd.exe` for command execution.

---

### `run.Command#exec([stdin], [callback])`
Spawn a subshell and execute the command.

#### Arguments
1. `[stdin]` *(String | Buffer | Vinyl)*: If given, this will be used as stdin for the command.
2. `[callback]` *(Function)*: The callback is called once the command has exited. An Error is passed if the exit status was non-zero. The error will have a `status` property set to the exit status.

#### Returns
*(Vinyl)*: Returns a [Vinyl] file wrapping the stdout of the command.

#### Example
```javascript
var cmd = new run.Command('cat');  // create a command object for `cat`.
cmd.exec('hello world');           // call `cat` with 'hello world' on stdin.
```

---

## The ISC License
Copyright (c) 2014 Chris Barrick <cbarrick1@gmail.com>
Copyright (c) 2016 Marc Binder <marcandrebinder@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

[gulp-rename]: https://github.com/hparra/gulp-rename
[gulp-shell]: https://github.com/sun-zheng-an/gulp-shell
[gulp-spawn]: https://github.com/hparra/gulp-spawn
[template]: http://lodash.com/docs#template
[Vinyl]: https://github.com/wearefractal/vinyl
