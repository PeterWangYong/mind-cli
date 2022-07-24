"use strict";

const cp = require("child_process");
const Spinner = require("cli-spinner").Spinner;

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function spinnerStart(msg, spinnerString = "|/-\\") {
  const spinner = new Spinner(msg + " %s");
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

// 兼容windows操作系统
function exec(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => reject(e));
    p.on("exit", (c) => resolve(c));
  });
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  exec,
  execAsync,
};
