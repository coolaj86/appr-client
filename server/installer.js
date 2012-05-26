/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function() {
  "use strict";
  
  var fs = require('fs.extra')
    , path = require('path')
    , tar = require('tar')
    , zlib = require('zlib')
    , semver = require('semver')
    , npm = require('npm')
    , exec = require('child_process').exec
    , request = require('ahr2')
    , serverRoot = __dirname
    , mountDir = path.join(serverRoot, 'mounts')
    , weirdThing = false
    // careful to keep pkgRoot as the real root
    , pkgRoot = path.join(__dirname, '..')
    , tmpPath = process.env.TEMP || process.env.TMPDIR || '/tmp'
    ;

  if(/^win/.exec(process.platform)) {
    //tmpPath = process.env['TEMP'];
    weirdThing = true;
  }

  function installer(tarballLocation, packageName, newVer, selfUpdate, responder, wacServerUrl) {
    function pullAndSave(err, ahr, data) {
      console.log('gunzipping!');
      zlib.gunzip(data, saveTheTar);
    }

    if(selfUpdate) {
      request.get(wacServerUrl + "/releases/" + newVer + "/client-" + newVer + ".tgz").when(pullAndSave);
    } else {
      request.get(tarballLocation).when(pullAndSave);
    }

    function saveTheTar(err, tarball) {
      console.log('about to write');

      function saveIt(err, fd) {
        if(err) {
          console.log("Error opening file:", err);
          return;
        }
        fs.write(fd, tarball, 0, tarball.length, null, function(err, written, buffer) {
          if(err && !selfUpdate) {
            console.error(err);
            responder.end(JSON.stringify({success: false, data: err}));
            return;
          }
          console.log('File Written!!');
          untarAndInstall();
        });
      }

      fs.open(
          path.join(__dirname, 'downloads', packageName + '-' + newVer + '.tar')
        , 'w'
        , parseInt('0644', 8)
        , saveIt
      );
    }

    function untarAndInstall() {
      var packagePath
        , tempPath = mountDir
        , newPackagePath = path.join(__dirname, 'downloads', packageName + '-' + newVer + '.tar')
        ;

      if(selfUpdate) {
        packagePath = pkgRoot;
        tempPath = pkgRoot;
      } else {
        packagePath = path.join(tempPath, packageName);
      }

      if(!path.existsSync(packagePath)) {
        console.log('TEMPPATH', tempPath);
        console.log('PACKAGEPATH', packagePath);
        //fs.mkdirSync(packagePath, parseInt('0755', 8));
      }

      function onError(er) {
        console.error("error during extraction:", er);
        if(!selfUpdate) {
          responder.end(JSON.stringify({success: false, data: er}));
        }
      }

      function onClose() {
        function thingToDo() {
          var newPath = path.join(tempPath, 'package')
            ;

          // TODO clear out old files, but not data (like the self-update tar), etc
          //fs.rmrf(packagePath, function () {
            fs.rename(newPath, packagePath, function() {
              console.log(packageName + ' is installed!\nNow installing its dependencies.');
              installDeps(packageName);
            });
          //});
        }

        if(selfUpdate) {
          process.exit();
        } else {
          // This setTimeout is a shim to get around node-tar's bug where it tries to chown
          // things after it's done extracting -_-.
          setTimeout(thingToDo, 100);
        }
      }

      fs.createReadStream(newPackagePath)
        .pipe(tar.Extract({path: tempPath}))
        .on("error", onError)
        .on("close", onClose)
        ;
    }

    function installDeps(packageName) {
      npm.load(function(er) {
        console.log('npm.load called');
        npm.prefix = path.join(mountDir, packageName);
        npm.install(function(er) {
          console.log('this is the npm.install callback');
          if(er) {
            console.error("Problem installing dependencies: ", er);
            responder.end(JSON.stringify({success: false, data: packageName + ' failed installing.'}));
            return;
          }
          if(!selfUpdate) {
            responder.end(JSON.stringify({success: true, data: packageName + ' installed'}));
            process.exit();
          }
        });
      });
    }
  }

  module.exports = installer;
}());
