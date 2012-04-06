(function() {
  "use strict";

  var fs = require('fs')
    , forEachAsync = require('forEachAsync')
    , request = require('ahr2')
    , installer = require('./installer')
    , createSequence = require('sequence')
    , rimraf = require('rimraf')
    , sequence = createSequence()
    , mountDir = __dirname + '/mounts'
    ;

  function getTarget() {
    return "http://norman.spotter360.org:5984";
  }

  function packageApp(app) {
    app.get("/applist", nabPackageList);
    app.get("/installed", nabLocalList);
    app.get("/alive", itsalive);
    app.post("/install/:packageName", findTarball);
    app.post("/delete/:packageName", deleteApp);

    function itsalive(req, res) {
      res.end(JSON.stringify({ success: true, message: "It's ALIVE!!!!!" }));
    }
    function nabPackageList(req,res) {
      request.get(getTarget()).when(function(err, ahr, data) {
        if(err) {
          console.error("Problem contacting update server: ", err);
          res.end(JSON.stringify({success: false, message: "Unable to contact update server."}));
        }
        res.end(JSON.stringify(data));
      });
    }
    function nabLocalList(req,res) {
      var installed = []
        ;
      fs.readdir(mountDir, function(err, files) {
        if(err) {
          console.error("Problem reading vhost directory:", err);
          res.end(JSON.stringify({success: false, message: err}));
          return;
        }

        forEachAsync(files,function(next, fileName, index) {
          if(/^\./.test(fileName)) {
            next();
            return;
          }
          installed.push(fileName.replace(/\.local\.apps\.spotter.*/g, ""));
          next();
        }).then(function() {
          res.end(JSON.stringify({success: true, data: installed}));
        });
      });
    }

    function findTarball(req,res) {
      request(getTarget() + '/' + req.params.packageName + '/latest').when(function(err, arh, data) {
        if(err) {
          console.error("Problem contacting update server.");
          return;
        }
        if(typeof data !== "object") {
          try {
          data = JSON.parse(data);
          } catch(e) {
            console.error("Bad data from server!");
            return;
          }
        }
        installer(data.dist.tarball, req.params.packageName, data.version, false, res);
      });
    }

    function deleteApp(req,res) {
      fs.stat(mountDir + '/' + req.params.packageName, function(err, stats) {
        if(err || !stats.isDirectory()) {
          res.end(JSON.stringify({ success: false, message: "Package '" 
          + req.params.packageName 
          + "' does not exist." }));
          return;
        }
        rimraf(mountDir + '/' + req.params.packageName, function(er) {
          if(er) {
            console.error("Problem removing package '"+req.params.packageName+"': "+ er);
            res.end(JSON.stringify({ success: false, message: "Problem removing package'"
            + req.params.packageName
            + "': "+ er}));
            return;
          }
          res.end(JSON.stringify({success: true, data: req.params.packageName}));
        });
      });
    }
    module.exports = app;
  }
  module.exports = packageApp;
}());
