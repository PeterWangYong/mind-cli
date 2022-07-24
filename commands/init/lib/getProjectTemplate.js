const request = require("@mind-cli/request");

module.exports = function () {
  return request({
    url: "/project/template",
  });
};
