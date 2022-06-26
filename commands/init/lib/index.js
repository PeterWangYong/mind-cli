"use strict";

const Command = require("@mind-cli/command");
const log = require("@mind-cli/log");
const fs = require("fs");

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.opts().force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  exec() {
    try {
      // 1. 准备阶段
      this.prepare();
      // 2. 下载模板
      // 3. 安装模板
    } catch (e) {
      log.error(e.message);
    }
  }

  prepare() {
    // 1. 判断当前目录是否为空（这里可以新建项目目录，而不是清空当前目录）
    if (!this.isCwdEmpty()) {
      // 询问是否继续创建
    }
    // 2. 是否启动强制更新
    // 3. 选择创建项目或组件
    // 4. 获取项目基本信息
  }

  isCwdEmpty() {
    const localPath = process.cwd();
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter((file) => {
      return !file.startsWith(".") || ["node_modules"].indexOf(file) < 0;
    });
    return !fileList || fileList.length <= 0;
  }
}

function init(args) {
  return new InitCommand(args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
