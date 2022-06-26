"use strict";

const path = require("path");
const cp = require("child_process");
const Package = require("@mind-cli/package");
const log = require("@mind-cli/log");

const SETTINGS = {
  init: "@imooc-cli/init",
};

const CACHE_DIR = "dependencies";

async function exec(...args) {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);
  let storeDir = "";
  let pkg = null;
  const cmdObj = args[args.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";
  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      // 在当前进程中执行
      // require(rootFile)(args);
      // 在子进程中执行
      // 把cmd对象中不需要的属性去掉
      const o = Object.create(null);
      const cmd = args[args.length - 1];
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      // 存放opts的值用于Command/initArgs中还原opts函数
      o.opts = cmd.opts();
      args[args.length - 1] = o;
      const code = `require('${rootFile}')(${JSON.stringify(args)})`;
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (err) => {
        log.error(err.message);
        process.exit(1);
      });
      child.on("exit", (data) => {
        log.verbose("命令执行成功:", data);
        process.exit(data);
      });
    } catch (err) {
      log.error(err.message);
    }
  }
}

// 兼容windows操作系统
function spawn(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = exec;
