#!/usr/local/bin/node
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
 

  var connect = require('connect')
    /*
     *  CONFIG STUFF that should be moved out
     */
    , xcorsOptions =  { 
          origins: ["http://apps.spotterrf.com", "http://hurpdurp.com"]
        , methods: ['GET', 'POST']
        , headers: ['Content-Type', 'Accept']
        , credentials: false
      }
    , port = 7770
    , wacServer = "http://apps.spotterrf.com:3999"
    //, wacServer = "http://hurpdurp.com:3999"
    , curVer = "0.0.2"
    /*
     * NORMAL STUFF
     */
    , fs = require('fs')
    , path = require('path')
    , connectRouter = require('connect_router')
    , semver = require('semver')
    , request = require('ahr2')
    , xcors = require('connect-xcors')
    , installer = require('./installer')
    , pullRoute = require('./router')
    , args = process.argv
    , publicPath = path.join(__dirname, '..', 'webclient-deployed')
    , mountDir = path.join(__dirname, 'mounts')
    , mounterFactory = require('connect-mounter')
    , mounter = mounterFactory.create(mountDir)
    , failures = mounterFactory.fail
    , app
    ;

  if (failures) {
    console.log('BAD APPS:', failures);
  }

  function update() {
    request.get(wacServer + "/version").when(function(err, ahr, data) {
      if(err || data.error === true) {
        console.log('Could not contact WebAppsCenter update service. Going it alone...');
        return;
      }

      if(semver.gt(data.result, curVer)) {
        console.log("New version detected... downloading and installing!");
        //newVer = data.result;
        installer(null, "browser", data.result, true, null, wacServer);
      }
    });
  }

  if((parseFloat(args[2]) === parseInt(args[2], 10)) && !isNaN(args[2])) {
    port = args[2];
  }

  if(typeof args[3] !== 'undefined' && fs.statSync(args[3]).isDirectory()) {
    if(args[3].substring(0,1) == '/'
    ||(/^win/.exec(process.platform) && /[A-Z]:/.test(args[3].substring(0,2)))) {
      publicPath = args[3];
    } else {
      publicPath = __dirname + '/' + args[3];
    }
  }

  function router(rest) {
    rest.get('/update', function (req, res) {
      update();
      res.end('{"success": true, "result": null, "errors": []}');
    });
  }

  update();

  app = connect()
    .use(connectRouter(router))
    .use(mounter)
    .use(xcors(xcorsOptions))
    .use(connect.router(pullRoute))
    //TODO remove this static / directory serving. Everything should be
    // being pulled from the HTML5 webapp already.
    .use(connect.static(publicPath))
    .use(connect.directory(publicPath))
    ;

  module.exports = app;
}());
