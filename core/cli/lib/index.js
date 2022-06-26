"use strict";

module.exports = index;

const path = require("path");
const semver = require("semver");
const colors = require("colors/safe");
const rootCheck = require("root-check");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const dotenv = require("dotenv");
const commander = require("commander");

const log = require("@mind-cli/log");
const { getLastNpmVersion } = require("@mind-cli/get-npm-info");
const init = require("@mind-cli/init");
const exec = require("@mind-cli/exec");

const pkg = require("../package.json");
const constant = require("./const");

async function index() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

function registerCommand() {
  const program = new commander.Command();
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);
  // 开启debug模式
  program.on("option:debug", () => {
    process.env.LOG_LEVEL = program.opts().debug ? "verbose" : "info";
    log.level = process.env.LOG_LEVEL;
  });
  // 设置targetPath
  program.on("option:targetPath", () => {
    process.env.CLI_TARGET_PATH = program.opts().targetPath;
  });
  // 对未知命令的监听
  program.on("command:*", (unknownCommands) => {
    console.log(colors.red(`未知的命令: ${unknownCommands[0]}`));
    const availableCommands = program.commands.map((cmd) => cmd.name());
    if (availableCommands.length > 0) {
      console.log(colors.red(`可用的命令: ${availableCommands.join(",")}`));
    }
  });

  program.parse(process.argv);
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm API，获取所有版本号
  // 3. 提取所有版本号，比对有哪些版本号大于当前版本号
  // 4. 获取最新的版本号，提示用户更新到该版本
  const lastVersion = await getLastNpmVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(
        `请手动更新 ${npmName}, 当前版本 ${currentVersion}, 最新版本 ${lastVersion}
         更新命令: npm install -g ${npmName}`
      )
    );
  }
}
// 加载环境变量
function checkEnv() {
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
  }
  createDefaultEnv();
}

function createDefaultEnv() {
  const cliHome = process.env.CLI_HOME || constant.DEFAULT_CLI_HOME;
  process.env.CLI_HOME_PATH = path.resolve(userHome, cliHome);
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在!"));
  }
}

function checkRoot() {
  rootCheck();
}

function checkPkgVersion() {
  log.notice("cli", pkg.version);
}
