'use script';

let globalHooker;
const exit = require('exit');
const { name } = require('./package.json');
const VALID_TASK_TYPE = ['string', 'array', 'function'];

const hookFunction = function(grunt) {
  if (globalHooker) return globalHooker;

  const hookMap = {};
  const runTask = grunt.task.run;

  const hooker = {
    _run(tasks) {
      if (!tasks || !tasks.length) return;
      return runTask.apply(grunt.task, arguments);
    },

    _hook(where, taskName, description, task) {
      if (!task) return;
      if (!hookMap[taskName]) hookMap[taskName] = { pre: [], post: [], replace: [] };

      const hookTaskList = hookMap[taskName][where];
      const hookTaskName = `$hook_${where}_${taskName}_${hookTaskList.length}`;
      
      hookTaskList.push(hookTaskName);
      grunt.registerTask(hookTaskName, description, task);
    },

    _unhook(taskName, where) {
      const hookTask = hookMap[taskName];
      const tasks = grunt.task._tasks;
      hookTask[where].forEach(function(task) { delete tasks[task]; });
      hookTask[where] = [];
    },

    hook(taskName, description, task, where) {
      const descType = grunt.util.kindOf(description);
      const taskNameType = grunt.util.kindOf(taskName);
      let taskType = grunt.util.kindOf(task);

      if (
        (descType !== 'string' && description) || // hook('clean', []) hook('clean', function() {}, true)
        (descType === 'string' && description && (!task || taskType === 'boolean'))  // hook('build', 'clean') hook('build', 'clean', true)
      ) { 
        where = task;
        task = description; 
        description = null;
        taskType = grunt.util.kindOf(task);
      }

      if (
        !task || 
        VALID_TASK_TYPE.indexOf(taskType) < 0 ||
        (taskType === 'array' && !task.length) 
      ) return;

      const whereType = grunt.util.kindOf(where);

      if (!where) {
        where = 'pre';
      } else if (whereType === 'boolean') {
        where = where ? 'post' : 'pre';
      }

      if (grunt.option('verbose')) {
        const displayHookName = typeof task === 'function' ? '[Function]' : typeof task === 'string' ? task : JSON.stringify(task);
        const displayTaskName = typeof taskName === 'string' ? taskName : JSON.stringify(taskName);
        grunt.log.writeln(`\nHookTask:`, `${where} ${displayTaskName}`.cyan, `, with:`, `${displayHookName}`.cyan, `, desc:`, `${description}`.cyan);

        // 通过 stack 属性获取堆栈信息，通常第一行是 Error，第二行是错误的来源，第三行是函数的调用来源
        // 即 stack[1] 是调用者信息，格式通常为 "    at functionName (path/to/file.js:line:column)"
        // 匹配括号内的内容，提取文件路径和行列信息
        const err = new Error();
        const stack = err.stack.split('\n');
        const callerLine = stack[2] || "Unknown caller";
        const regex = /\((.*?)\)/; 
        const match = regex.exec(callerLine);
        if (match) {
          const [filePath, line, column] = match[1].split(":");
          grunt.log.writeln(`Source:`, `${filePath}:${line}:${column}`.gray);
        }
      }

      if (taskNameType === 'array') {
        taskName.forEach((tsn) => this._hook(where, tsn, description, task));
      } else {
        this._hook(where, taskName, description, task);
      }
    },

    unhook(taskName, where) {
      if (grunt.util.kindOf(taskName) === 'array') {
        taskName.forEach((tsn) => this.unhook(tsn, where));
      } else {
        const hookTask = hookMap[taskName];
        if (!hookTask) return;
        if (where === 'pre' || !where || where === 'both') this._unhook(taskName, 'pre');
        if (where === 'post' || !where || where === 'both') this._unhook(taskName, 'post');
        if (where === 'replace' || !where || where === 'both') this._unhook(taskName, 'replace');
        if (!hookTask.pre.length && !hookTask.post.length && !hookTask.replace.length) delete hookMap[taskName];
      }
    }
  };

  // override original function
  grunt.task.run = function(taskName) {
    if (grunt.util.kindOf(taskName) === 'array') {
      taskName.forEach(function(task) {
        grunt.task.run(task);
      });
    } else {
      const hookTask = hookMap[taskName];
      if (hookTask && taskName) {
        // pre
        hooker._run(hookTask.pre);

        if (
          hookTask.replace && 
          hookTask.replace.length
        ) {
          // replace
          hooker._run(hookTask.replace.slice(hookTask.replace.length - 1));
        } else {
          // original
          runTask.apply(this, arguments);
        }

        // post
        hooker._run(hookTask.post);
      } else {
        return runTask.apply(this, arguments);
      }
    }
  }

  // add grunt method
  grunt.hookTask = grunt.task.hookTask = hooker.hook.bind(hooker);
  grunt.unhookTask = grunt.task.unhookTask = hooker.unhook.bind(hooker);
  
  return (globalHooker = hooker);
};

Object.defineProperty(hookFunction, 'hook', {
  get: function() {
    console.error(`Error: Use hooker like "require(\'${name}\')(grunt)"`.red);
    exit(0);
  }
});

Object.defineProperty(hookFunction, 'unhook', {
  get: function() {
    console.error(`Error: Use hooker like "require(\'${name}\')(grunt)"`.red);
    exit(0);
  }
});

module.exports = hookFunction;
