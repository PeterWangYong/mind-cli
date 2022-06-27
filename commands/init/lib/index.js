"use strict";

const fs = require("fs");
const inquirer = require("inquirer");
const fse = require("fs-extra");
const semver = require("semver");
const Command = require("@mind-cli/command");
const log = require("@mind-cli/log");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.opts().force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const ret = await this.prepare();
      if (ret) {
        // 2. 下载模板
        // 3. 安装模板
      }
    } catch (e) {
      log.error(e.message);
    }
  }

  async prepare() {
    // 1. 判断当前目录是否为空（这里可以新建项目目录，而不是清空当前目录）
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        const answer = await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          default: false,
          message: "当前文件夹不为空，是否继续创建项目? ",
        });
        ifContinue = answer.ifContinue;

        if (!ifContinue) {
          return;
        }
      }
      // 2. 启动强制更新
      if (ifContinue || this.force) {
        // 二次确认是否清空目录
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件? ",
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    const projectInfo = {};
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    // 2. 获取项目基本信息
    if (type === TYPE_PROJECT) {
      const o = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          default: "",
          validate(v) {
            // 首字符必须为英文
            // 尾字符必须为英文或数字
            // 特殊字符仅允许"-_"
            // 合法：a, a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1, a1, a1_b1_c1, a1-b1-c1
            // 不合法: 1, a_, a-, a_1, a-1
            var done = this.async();
            setTimeout(function () {
              if (
                !/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
                  v
                )
              ) {
                done("请输入合法的项目名称");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter(v) {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate(v) {
            var done = this.async();
            setTimeout(function () {
              if (!semver.valid(v)) {
                done("请输入合法的版本号");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter(v) {
            if (!!semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
      ]);
      console.log(o);
    } else if (type === TYPE_COMPONENT) {
    }
    return projectInfo;
  }

  isDirEmpty(localPath) {
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
