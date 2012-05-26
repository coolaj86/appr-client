#!/usr/bin/env node
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  // This is a shim for the existing installers which expect this executable to
  // be in this location with this name

  var app = module.exports = require('./server/')
    , server
    ;

  if (require.main === module) {
    server = app.listen(7770, function () {
      var addr = server.address()
        ;

      console.log("Listening on http://%s:%d", addr.address, addr.port);
    });
  }
}());
