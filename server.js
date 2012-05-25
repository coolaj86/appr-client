#!/usr/local/bin/node
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
 
  var connect = require('connect')
    , fs = require('fs')
    , semver = require('semver')
    , request = require('ahr2')
    , xcors = require('connect-xcors')
    , installer = require('./installer')
    , pullRoute = require('./router')
    , server = "http://apps.spotterrf.com:3999"
    //, server = "http://hurpdurp.com:3999"
    , publicPath = __dirname + '/public'
    , port = 7770
    , curVer = "0.0.2"
    , args = process.argv
    , mountDir = __dirname + '/mounts'
    , mounterFactory = require('connect-mounter')
    , mounter = mounterFactory.create(mountDir)
    , failures = mounterFactory.fail
    , xcorsOptions =  { 
                        origins: ["http://apps.spotterrf.com"]
                        //origins: ["http://hurpdurp.com"]
                      , methods: ['GET', 'POST']
                      , headers: ['Content-Type', 'Accept']
                      , credentials: false
                      }
    , app
    ;
  console.log('BAD APPS:', failures);
  request.get(server + "/version").when(function(err, ahr, data) {
    if(err || data.error === true) {
      console.log('Could not contact update server. Going it alone...');
      return;
    }

    if(semver.gt(data.result, curVer)) {
      console.log("New version detected... downloading and installing!");
      //newVer = data.result;
      installer(null, "browser", data.result, true, null, server);
    }
  });

  if((parseFloat(args[2]) === parseInt(args[2], 10)) && !isNaN(args[2])) {
    port = args[2];
  }

  if(typeof args[3] !== 'undefined' && fs.statSync(args[3]).isDirectory()) {
    if(args[3].substring(0,1) == '/'
    ||(process.platform === 'win32' && /[A-Z]:/.test(args[3].substring(0,2)))) {
      publicPath = args[3];
    } else {
      publicPath = __dirname + '/' + args[3];
    }
  }

  app = connect()
    .use(mounter)
    .use(xcors(xcorsOptions))
    .use(connect.router(pullRoute))
    //TODO remove this static / directory serving. Everything should be
    // being pulled from the HTML5 webapp already.
    .use(connect.static(publicPath))
    .use(connect.directory(publicPath))
    ;
  app.listen(port);
  console.log("Now serving on port " + port + ".");

}());
