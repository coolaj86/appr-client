(function() {
  "use strict";
  
  var fs = require('fs.extra')
    , mkdirp = require('mkdirp')
    , path = require('path')
    , tar = require('tar')
    , zlib = require('zlib')
    , npm = require('npm')
    , request = require('ahr')
    ;

  function Installer(opts) {
    var me = this
      ;

    me._installQueue = [];
    me._appsPath = opts.appsPath;
    me.tmpPath = opts.tmpPath;
    // careful to keep pkgRoot as the real root
    me._pkgRoot = opts.packageRoot;
    me.complete = function (err, data) {
      if (!err) {
        //fs.unlink(me._downloadedTarfile, function (err) {
          if (err) {
            console.error(err);
          }
        //});
      }
      me._installInProgress = false;
      opts.complete(err, data);
    };

    me.downloadDir = me.tmpPath;
  }

  Installer.prototype.install = function (href, opts) {
    var me = this
      ;

    if (me._installInProgress) {
      me._installQueue.push({ href: href, opts: opts });
    }
    me._installInProgress = true;
    me._pleaseInstallDeps = true;
    me._finalPackagePath = path.join(me._appsPath, opts.packageName);
    me._downloadedTarfile = path.join(me.downloadDir, opts.packageName + '-' + opts.packageVersion + '.tar');
    me._untarPath = path.join(me._appsPath, 'tmppackage');
    if('self' === opts.packageName) {
      me._pleaseInstallDeps = false;
      me._finalPackagePath = me._pkgRoot;
      me._untarPath = me._pkgRoot;
    }

    function saveTheTar(err, tarBuffer) {
      var fws
        ;

      fws = fs.createWriteStream(me._downloadedTarfile, { mode: parseInt('0644', 8) });
      fws.on('error', function (err) {
        if (err) {
          console.error("Error opening file:", err);
          me.complete(err);
        }
      });
      fws.end(tarBuffer, function(err) {
        if(err) {
          me.complete(err);
          return;
        }
        console.log('File Written!!');
        me.untarAndInstall();
      });
    }

    function pullAndSave(err, ahr, data) {
      if (err || !data) {
        me.complete(err || 'no download');
        return;
      }

      console.log('gunzipping!');
      zlib.gunzip(data, saveTheTar);
    }

    console.log('untarPath', me._untarPath);
    mkdirp(me._untarPath, function () {
      console.log('made dir');
      request.get(href).when(pullAndSave);
    });
  };

  Installer.prototype.untarAndInstall = function () {
    var me = this
      , closed = false
      ;

    if(!path.existsSync(me._finalPackagePath)) {
      console.log('TEMPPATH', me._untarPath);
      console.log('PACKAGEPATH', me._finalPackagePath);
      //fs.mkdirSync(me._finalPackagePath, parseInt('0755', 8));
    }

    function onError(er) {
      console.error("error during extraction:", er);
      me.complete(er);
    }

    function onClose() {
      if (closed) {
        return;
      }
      closed = true;
      function movePackageHome() {
        // TODO clear out old files, but not data (like the self-update tar), etc
        //fs.rmrf(me._finalPackagePath, function () {
          fs.rename(me._untarPath, me._finalPackagePath, function () {
            console.log('package installed!\nNow installing its dependencies.');
            me.installDeps();
          });
        //});
      }

      if(me._untarPath === me._finalPackagePath) {
        console.log('same paths');
        me.installDeps();
      } else {
        movePackageHome();
      }
    }

    console.log('untar-ing...', me._untarPath);
    fs.createReadStream(me._downloadedTarfile)
      .pipe(tar.Extract({ path: me._untarPath }))
      .on("error", onError)
      .on("close", function () {
          // This setTimeout is a shim to get around node-tar's bug where it tries to chown
          // things after it's done extracting -_-.
          setTimeout(onClose, 100);
        })
      ;
  };

  Installer.prototype.installDeps = function () {
    var me = this
      ;

    if (!me._pleaseInstallDeps) {
      me.complete(null, 'install complete, no deps');
      return;
    }

    npm.load(function(er) {
      if (er) {
        console.error(er);
        me.complete(er);
        return;
      }

      console.log('npm.load called');
      npm.prefix = me._finalPackagePath;
      npm.install(function(er) {
        console.log('this is the npm.install callback');

        if(er) {
          console.error("Problem installing dependencies: ", er);
          me.complete(new Error('installation failed'));
          return;
        }

        me.complete(null, 'installation succeeded');
      });
    });
  };

  Installer.create = function (opts) {
    return new Installer(opts);
  };

  module.exports = Installer;
}());
