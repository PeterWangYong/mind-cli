"use strict";

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const fse = require("fs-extra");
const semver = require("semver");
const userHome = require("user-home");
const kebabCase = require("kebab-case");
const glob = require("glob");
const ejs = require("ejs");
const Command = require("@mind-cli/command");
const Package = require("@mind-cli/package");
const log = require("@mind-cli/log");
const { spinnerStart, sleep, execAsync } = require("@mind-cli/utils");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const WHITE_COMMANDS = ["npm", "cnpm"];

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
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.donwloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
    }
  }

  checkCommand(command) {
    if (WHITE_COMMANDS.includes(command)) {
      return command;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error("命令不存在! 命令: " + command);
      }
      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }

  async donwloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    const targetPath = path.resolve(userHome, ".mind-cli", "template");
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模板...");
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型!");
      }
    } else {
      throw new Error("项目模板信息不存在!");
    }
  }

  async ejsRender(ignore) {
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: process.cwd(),
          ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          console.log(process.cwd());
          console.log(files);
        }
      );
    });
  }

  async installNormalTemplate() {
    // 拷贝模板代码至当前目录
    const spinner = spinnerStart("正在安装模板...");
    await sleep();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copy(templatePath, targetPath);
    } catch (e) {
      throw new Error(e);
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }
    const ignore = ["node_modules/**"];
    await this.ejsRender(ignore);
    const { installCommand, startCommand } = this.templateInfo;
    // 依赖安装
    //await this.execCommand(installCommand, "依赖安装过程中失败!");
    // 启动命令执行
    // await this.execCommand(startCommand, "项目启动失败!");
  }
  async installCustomTemplate() {
    console.log("安装自定义模板");
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }
    this.template = template;
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
    let projectInfo = {};
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
      const project = await inquirer.prompt([
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
        {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模板",
          choices: this.createTemplateChoices(),
        },
      ]);
      projectInfo = { type, ...project };
    } else if (type === TYPE_COMPONENT) {
    }
    if (projectInfo.projectName) {
      // 将驼峰转成短横线连接
      projectInfo.className = kebabCase(projectInfo.projectName).replace(
        /^-/,
        ""
      );
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

  createTemplateChoices() {
    return this.template.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
}

function init(args) {
  return new InitCommand(args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
