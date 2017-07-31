'use strict';

const bower = require('gulp-bower');
const del = require('del');
const fs = require('fs');
const git = require('gulp-git');
const gulp = require('gulp');
const runSequence = require('run-sequence');
let run = require('gulp-run');

gulp.task('clean', function() {
  return del([__dirname + '/dist']);
});

let repos = [];

gulp.task('make-dist', function() {
  let json = JSON.parse(fs.readFileSync(__dirname + '/catalog.json'));
  let packages = json.packages;

  for (var repo in packages) {
    // The plan: copy all the elements and their deps into `/dist`.
    let path = __dirname + '/dist/' + repo;

    let repoName = repo;  // save this for later because loops.
    repos.push(path);     // save this for later to run bower on.

    // Skip this bit if there's nothing to clone.
    if (!packages[repo].git) {
      continue;
    }

    // Step 1. Clone the element.
    git.clone(packages[repo].git, {args: '--depth 1 -- ' + path}, function (err) {
      if (err) {
        console.log(err);
        return;
      }

      // Step 2. Delete the .git from it. Be very careful not to
      // Delete your own .git repo 🙄.
      del([path + '/.git']);
      del([path + '/.gitignore']);

      // Step 3. bower install the element's dependencies.
      console.log('Running bower install in ' + path);
      bower({cwd: path, verbosity: 1}).on('end', function() {
        // Step 5. Copy the element in its bower_components, so that
        // the demo works.
        gulp.src(path + '/**').pipe(gulp.dest(`${path}/bower_components/${repoName}`));
      });
    });
  }
});

gulp.task('default', function(done) {
  runSequence('clean', 'make-dist');
});
