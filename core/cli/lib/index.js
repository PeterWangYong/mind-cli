'use strict';

module.exports = index;

const semver = require('semver');
const colors = require('colors/safe');
const rootCheck = require('root-check');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const minimist = require('minimist');
const log = require('@mind-cli/log');

const pkg = require('../package.json');
const constant = require('./const');

function index() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
  } catch (e) {
    log.error(e.message);
  }
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
