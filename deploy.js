#!/usr/bin/env node
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  require('bufferjs');

  var spawn = require('child_process').spawn
    , fs = require('fs')
    , path = require('path')
    , util = require('util')
    , pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))
    , request = require('ahr2')
    , read = require('read')
    , semver = require('semver')
    , sequence = require('sequence').create()
    , wacProto = 'http://'
    , wacHost = "localhost:4040"
    , nextVer
    , releaseLevel
    ;

  // TODO sequence.then(function (next, context));

  if (/^win/.exec(process.platform)) {
    console.log(process.platform);
    process.exit(1);
  }

  sequence
    .then(function (next) {
      read({ "prompt": "Where will we be publishing today? (" + wacHost + "): " }, next);
    })
    .then(function (next, err, input) {
      wacHost = input || wacHost;
      request.get(wacProto + wacHost + '/version').when(next);
    })
    .then(function (next, err, ahr2, data) {
      if (err) {
        console.error(err);
        console.error("perhaps the server isn't up and running?");
        return;
      }
      console.log('package.json.version: ' + pkg.version);
      console.log('server version: ' + data.result);
      if (!semver.gt(pkg.version, data.result)) {
        console.warn('Try to keep your package.json.version up-to-date...');
      }
      read({ "prompt": "Is this a [m]ajor, mi[n]or, or [p]atch release? (p): "}, next);
    })
    .then(function (next, err, input) {
      var map = {
          "m": "major"
        , "n": "minor"
        , "p": "patch"
      };
      input = map[input || 'p'];
      releaseLevel = input;
      request.get(wacProto + wacHost + '/version/' + input).when(next);
    })
    .then(function (next, err, ahr2, data) {
      console.log('\n\n\n\nVersion: ' + data.result, '\n\n\n');
      nextVer = data.result;
      doDeploy(next);
    })
    .then(function () { /* do nothing */ })
    .then(doTar)
    .then(function (next, err, ahr2, data) {
      if (err) {
        console.error(err);
        return;
      }
      console.log("Published v" + data.result);
    })
    ;

  // XXX replace with tar module
  function doTar(next) {
    var tar
      , chunks = []
      ;

    tar = spawn('tar', ['-czf', '-', '.']);
    tar.stdout.on('data', function (chunk) {
      chunks.push(chunk);
    });
    tar.stderr.on('data', function (chunk) {
      util.print(chunk.toString('utf8'));
    });
    tar.on('exit', function (code) {
      console.log('tar complete');
      //console.log(wacProto + 'somethingkindasecret:yknow@' + wacHost + '/version/' + releaseLevel);
      request.post(
          wacProto + 'somethingkindasecret:yknow@' + wacHost + '/version/' + releaseLevel
        , null
        , Buffer.concat(chunks)
      ).when(next);
      //process.exit(code);
    });
  }

  function doDeploy(next) {
    var deploy = spawn('bash', ['./bin/deploy.sh'])
      ;

    deploy.stdout.on('data', function (data) {
      util.print(data.toString('utf8'));
    });
    deploy.stderr.on('data', function (data) {
      util.print(data.toString('utf8'));
    });
    deploy.on('exit', function (code) {
      next();
    });
  }
}());
