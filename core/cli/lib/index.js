'use strict';

module.exports = index;

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const rootCheck = require('root-check');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const minimist = require('minimist');
const dotenv = require('dotenv');

const log = require('@mind-cli/log');
const { getLastNpmVersion } = require('@mind-cli/get-npm-info');

const pkg = require('../package.json');
const constant = require('./const');

async function index() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
  } catch (e) {
    log.error(e.message);
  }
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
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
  }
  createDefaultEnv();
}

function createDefaultEnv() {
  const cliHome = process.env.CLI_HOME || constant.DEFAULT_CLI_HOME;
  process.env.CLI_HOME_PATH = path.resolve(userHome, cliHome);
}

function checkInputArgs() {
  const args = minimist(process.argv.slice(2));
  process.env.LOG_LEVEL = args.debug ? 'verbose' : 'info';
  log.level = process.env.LOG_LEVEL;
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在!'));
  }
}

function checkRoot() {
  rootCheck();
}

function checkNodeVersion() {
  // 1. 获取当前Node版本号
  const currentVersion = process.version;
  // 2. 比对最低版本号
  const lowestNodeVersion = constant.LOWEST_NODE_VERSION;
  if (!semver.gt(currentVersion, lowestNodeVersion)) {
    throw new Error(
      colors.red(`mind-cli 需要安装 v${lowestNodeVersion} 以上版本的 Node.js`)
    );
  }
}

function checkPkgVersion() {
  log.notice('cli', pkg.version);
}
