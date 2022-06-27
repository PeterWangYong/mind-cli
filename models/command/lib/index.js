"use strict";
const semver = require("semver");
const colors = require("colors/safe");
const log = require("@mind-cli/log");
const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(args) {
    if (!args) {
      throw new Error("参数不能为空! ");
    }
    if (!Array.isArray(args)) {
      throw new Error("参数必须为数组! ");
    }
    if (args.length < 1) {
      throw new Error("参数列表为空! ");
    }
    this._argv = args;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((err) => log.error(err.message));
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
    this._cmd.opts = () => this._cmd._opts;
  }

  checkNodeVersion() {
    // 1. 获取当前Node版本号
    const currentVersion = process.version;
    // 2. 比对最低版本号
    const lowestNodeVersion = LOWEST_NODE_VERSION;
    if (!semver.gt(currentVersion, lowestNodeVersion)) {
      throw new Error(
        colors.red(`mind-cli 需要安装 v${lowestNodeVersion} 以上版本的 Node.js`)
      );
    }
  }
  init() {
    throw new Error("init 必须实现");
  }
  exec() {
    throw new Error("exec 必须实现");
  }
}
module.exports = Command;
