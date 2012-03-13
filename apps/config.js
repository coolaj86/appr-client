(function () {
  "use strict";

  module.exports = {
      port: 8080
    , env: "production"
    , user: process.env['USER'] || process.env['USERNAME']
    //  http://user:pass@anything.server.net/github-hook
    , githookAuth: "spotter:spotterappsrestart"
  };
}());
