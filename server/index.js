#!/usr/local/bin/node
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
 

  var connect = require('connect')
    /*
     *  CONFIG STUFF that should be moved out
     */
    , xcorsOptions
    , xcorsDefaultOptions =  { 
          origins: ["http://apps.spotterrf.com", "http://hurpdurp.com"]
        , methods: ['GET', 'POST']
        , headers: ['Content-Type', 'Accept']
        , credentials: false
      }
    , port = 7770
    , wacServerUrl = "http://hurpdurp.com"
    /*
     * NORMAL STUFF
     */
    , fs = require('fs')
    , path = require('path')
    , pkgConfigPath = path.join(__dirname, '..', 'package.json')
    , curVer = JSON.parse(fs.readFileSync(pkgConfigPath)).version
    , connectRouter = require('connect_router')
    , semver = require('semver')
    , request = require('ahr2')
    , xcors = require('connect-xcors')
    , installer = require('./installer')
    , pullRoute = require('./router')
    , args = process.argv
    , publicPath = path.join(__dirname, '..', 'webclient-deployed')
    , releasesPath = path.join(__dirname, '..', 'webclient-deployed', 'releases')
    , mountDir = path.join(__dirname, 'mounts')
    , mounterFactory = require('connect-mounter')
    , DomStorage = require('dom-storage')
    , jsonStorage = require('json-storage').create(DomStorage.create(path.join(__dirname, 'settings.json')))
    , mounter = mounterFactory.create(mountDir)
    , failures = mounterFactory.fail
    , installLock
    , app
    ;

  // TODO allow 3rd party stores to be used via oauth or something
  //xcorsOptions = jsonStorage.get('xcors');
  if (!xcorsOptions) {
    xcorsOptions = xcorsDefaultOptions;
  }

  if (failures) {
    console.log('BAD APPS:', failures);
  }

  function update(cb) {
    request.get(wacServerUrl + "/version").when(function(err, ahr, data) {
      var newVer
        , selfUpdate = true
        , callback = null
        , installLockTimeout
        ;

      function removeInstallLock() {
        installLock = false;
        clearTimeout(installLockTimeout);
        installLockTimeout = 0;
      }

      if(err || data.error === true) {
        console.log('Could not contact WebAppsCenter update service. Going it alone...');
        return;
      }

      if (cb) {
        cb (err || data.error, curVer, newVer);
      }

      if (installLock) {
        return;
      }

      if(semver.gt(data.result, curVer)) {
        console.log("New version (" + data.result + ") detected... downloading and installing!");
        newVer = data.result;
        installLock = true;
        installer(null, "client", newVer, selfUpdate, callback, wacServerUrl);
        installLockTimeout = setTimeout(removeInstallLock, 15 * 60 * 1000);
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

  function sendUpdateInfo(req, res) {
    function sendUpdateInfoHelper(err, curVer, newVer) {
      var errors = []
        , success = true
        ;

      if (err) {
        errors.push(err);
        success = false;
      }

      res.end(JSON.stringify({
          "success": success
        , "result": {
              current: curVer
            , latest: newVer
          }
        , "errors": errors
      }));
    }
    update(sendUpdateInfoHelper);
  }

  function router(rest) {
    rest.get('/update', sendUpdateInfo);
  }

  // check for updates every 3 hours
  setInterval(update, 3 * 60 * 60 * 1000);
  update();

  app = connect()
    .use(connectRouter(router))
    .use(mounter)
    .use(xcors(xcorsOptions))
    .use(connect.router(pullRoute))
    //TODO remove this static / directory serving. Everything should be
    // being pulled from the HTML5 webapp already.
    .use(connect.static(publicPath))
    .use(connect.static(releasesPath))
    .use(connect.directory(publicPath))
    ;

  module.exports = app;
}());
