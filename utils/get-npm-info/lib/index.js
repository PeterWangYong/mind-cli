"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

// 获取默认registry
function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}

// 获取NPM包发布信息
async function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  registry = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registry, npmName);
  try {
    const { status, data } = await axios.get(npmInfoUrl);
    return status === 200 ? data : null;
  } catch (error) {
    return null;
  }
}

// 提取NPM所有的版本号
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  return data ? Object.keys(data.versions) : [];
}

// 提取NPM较新的版本号
async function getNewerNpmVersions(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => (semver.gt(b, a) ? 1 : -1));
}

// 获取NPM最新的版本号
async function getLastNpmVersion(baseVersion, npmName, registry) {
  const newVersions = await getNewerNpmVersions(baseVersion, npmName, registry);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
}

// 获取所有版本中最新的版本号
async function getLatestNpmVersion(npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  if (versions) {
    return versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getLastNpmVersion,
  getDefaultRegistry,
  getLatestNpmVersion,
};
