# grunt-task-hook

> Forked from `grunt-task-hooker`. Support display `hookTask()` details and source in verbose mode.

<p align="center">
  <a href="https://www.npmjs.com/package/grunt-task-hook"><img alt="NPM Version" src="https://img.shields.io/npm/v/grunt-task-hook.svg?style=flat"/></a>
</p>

Add pre-execution and post-execution "hooks" to grunt task, see [issues/542](https://github.com/gruntjs/grunt/issues/542).

## Install

```
npm install grunt-task-hook --save-dev
```

## Usage

```js
// Gruntfile.js
module.exports = function (grunt) {

  // Don't forget to pass "grunt" object into the function!!!
  require('grunt-task-hook')(grunt);

  grunt.initConfig({
    clean: {
      src: {},
      dist: {}
    }
  });

  grunt.registerTask('build', [...]);

  // pre hook without description
  grunt.hookTask('build', 'clean:dist');

  // pre hook multi task
  grunt.hookTask(['build', 'dev'], 'clean:dist');

  // post hook with description
  grunt.hookTask('clean:src', 'post clean src', function() {
    const done = this.async();
    setTimeout(function() {
      done();
    }, false);
  }, true);

  // hook multi-type task
  grunt.hookTask('clean', 'pre clean all', function() {
    console.log('do something before all clean tasks');
  });

  // hook replace task
  grunt.hookTask('clean', 'ignore task clean', function() {
    console.log('replace original clean task');
  }, 'replace');

  // grunt.hookTask(taskName, desc, task, where);
  // where:
  // undefined/false => pre
  // true => post
  // pre/post/replace

  // unhook all hooks
  grunt.unhookTask('clean');

  // unhook multi hooks
  grunt.unhookTask(['clean', 'build']);

  // unhook all pre hooks
  grunt.unhookTask('build', 'pre');

  // unhook all post hooks
  grunt.unhookTask('build', 'post');
};
```

## License

The MIT License (MIT)
