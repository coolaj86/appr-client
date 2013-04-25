#!/usr/local/bin/node
(function () {
  "use strict";

  var steve = require('./steve')
    , connect = require('connect')
    , app = connect.createServer()
    /*
     *  CONFIG STUFF that should be moved out
     */
    , xcorsOptions
    , xcorsDefaultOptions = { 
          origins: ["http://apps.spotterrf.com", "http://hurpdurp.com"]
        , methods: ['GET', 'POST']
        , headers: ['Content-Type', 'Accept']
        , credentials: false
      }
    , port = process.argv[2] || 7770
    , publicDir = process.argv[3]
    , wacServerUrl = "http://hurpdurp.com"
    /*
     * NORMAL STUFF
     */
    , fs = require('fs')
    , path = require('path')
    , pkgConfigPath = path.join(__dirname, '..', 'package.json')
    , curVer = JSON.parse(fs.readFileSync(pkgConfigPath)).version
    , semver = require('semver')
    , request = require('ahr2')
    , xcors = require('connect-xcors')
    , installer = require('./installer')
    , pullRoute = require('./router')
    , publicPath = path.join(__dirname, '..', 'webclient-deployed')
    , releasesPath = path.join(__dirname, '..', 'webclient-deployed', 'releases')
    , mountDir = path.join(__dirname, 'mounts')
    , mounterFactory = require('connect-mounter')
    //, DomStorage = require('dom-storage')
    //, jsonStorage = require('json-storage').create(DomStorage.create(path.join(__dirname, 'settings.json')))
    , mounter = mounterFactory.create(mountDir)
    , failures = mounterFactory.fail
    , installLock
    ;

  // TODO allow 3rd party stores to be used via oauth or something
  //xcorsOptions = jsonStorage.get('xcors');
  if (!xcorsOptions) {
    xcorsOptions = xcorsDefaultOptions;
  }
  /*
  app.corsConfig.headers = xcorsOptions.headers;
  app.corsConfig.origins = xcorsOptions.origins;
  app.corsConfig.methods = xcorsOptions.methods;
  app.corsConfig.credentials = xcorsOptions.credentials;
  */

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

  if((parseFloat(port) !== parseInt(port, 10)) || !isNaN(port)) {
    port = 7770;
  }

  if(typeof publicDir !== 'undefined' && fs.statSync(publicDir).isDirectory()) {
    if (publicDir.substring(0, 1) === '/'
    || (/^win/.exec(process.platform) && /[A-Z]:/.test(publicDir.substring(0,2)))) {
      publicPath = publicDir;
    } else {
      publicPath = __dirname + '/' + publicDir;
    }
  }

  function sendUpdateInfo(req, res) {
    function sendUpdateInfoHelper(err, curVer, newVer) {

      if (err) {
        res.error(err);
      }

      res.json({
          current: curVer
        , latest: newVer
      });
    }

    update(sendUpdateInfoHelper);
  }

  function router(rest) {
    rest.get('/update', sendUpdateInfo);
  }

  // check for updates every 3 hours
  setInterval(update, 3 * 60 * 60 * 1000);
  update();

  app
    .use(steve)
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
