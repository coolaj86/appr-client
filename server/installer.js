/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function() {
  "use strict";
  
  var fs = require('fs')
    , path = require('path')
    , tar = require('tar')
    , zlib = require('zlib')
    , semver = require('semver')
    , npm = require('npm')
    , exec = require('child_process').exec
    , request = require('ahr2')
    , pathSep = '/'
    , mountDir = __dirname + '/mounts/'
    , weirdThing = false
    , mainServer = 'http://apps.spotterrf.com'
    //, mainServer = 'http://hurpdurp.com'
    ;

  if(process.platform === 'win32') {
    weirdThing = true;
    pathSep = '\\';
  }


  function installer(tarballLocation, packageName, newVer, selfUpdate, responder, server) {
    if(!selfUpdate) {
      request.get(tarballLocation).when(pullAndSave);
    } else {
      request.get(server + "/releases/" + newVer + "/browser.tgz").when(pullAndSave);
    }

    function pullAndSave(err, ahr, data) {
      console.log('gunzipping!');
      zlib.gunzip(data, saveTheTar);
    }

    function saveTheTar(err, tarball) {
      console.log('about to write');
      fs.open(__dirname
              + pathSep + 'downloads' + pathSep
              + packageName
              + '-'
              + newVer
              + '.tar'
            , 'w'
            , parseInt('0644', 8)
            , function(err, fd) {
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
      });
    }

    function untarAndInstall() {
      var packagePath
        , tempPath = mountDir
        ;

      if(!selfUpdate) {
        packagePath = tempPath + packageName + pathSep;
      } else {
        packagePath = __dirname;
        tempPath = __dirname;
      }
      if(!path.exists(packagePath)) {
        console.log('TEMPPATH', tempPath);
        console.log('PACKAGEPATH', packagePath);
        //fs.mkdirSync(packagePath, parseInt('0755', 8));
      }
      fs.createReadStream(__dirname + pathSep + 'downloads' + pathSep + packageName + '-' + newVer + '.tar')
        .pipe(tar.Extract({path: tempPath}))
        .on("error", function(er) {
          console.error("error during extraction:", er);
          if(!selfUpdate) {
            responder.end(JSON.stringify({success: false, data: er}));
          }
        })
        .on("close", function() {
          if(selfUpdate) {
            process.exit();
          } else {
            // This setTimeout is a shim to get around node-tar's bug where it tries to chown
            // things after it's done extracting -_-.
            setTimeout(function() {
              fs.rename(tempPath + pathSep + 'package' + pathSep, packagePath, function() {
                console.log(packageName + ' is installed!\nNow installing its dependencies.');
                installDeps(packageName);
              });
            }, 100);
          }
        });
    }

    function installDeps(packageName) {
      npm.load(function(er) {
        console.log('npm.load called');
        npm.prefix = mountDir + pathSep + packageName;
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
