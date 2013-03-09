(function () {
  "use strict";

  var config = require('./config')
    , pkg = require('./package.json')
    , connect = require('connect')
    , path = require('path')
    , xcors = require('connect-xcors')
    //, oauth = require('oauth')
    , Storage = require('dom-storage')
    , localStorage = new Storage(path.join(__dirname, 'var', 'db.json'))
    , JsonStorage = require('json-storage')
    , store = JsonStorage.create(localStorage, 'this')
    , app
    , server
    , corsOptions = {}
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  corsOptions.origins = store.get('masterOrigins');
  if (!corsOptions.origins) {
    corsOptions.origins = config.masterOrigins;
    corsOptions.origins = store.set('masterOrigins');
  }

  if (!store.get('allApps')) {
    store.set('allApps', [{
        logo: config.masterApp.logo
      , name: pkg.name
      , version: pkg.version
      , installed: Date.now()
      , updated: Date.now()
      , scopes: config.masterApp.scopes
      , channel: config.masterApp.channel
      , origin: config.masterApp.origin
      , license: pkg.license
    }]);
  }

  // TODO mounter & vhoster
  // TODO steve / json
  function router(routes) {
    routes.get('/init', function (req, res) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (store.get('allApps')) {
        res.write('{ "initialized": true }');
      } else {
        res.write('{ "initialized": false }');
      }
      res.end();
    });
    routes.post('/init', function (req, res) {
      // This would be the thing to poll over and over on initial install
      //store.set('masterOrigins', req.body.masterOrigins)
      //store.set('allApps', [req.body.masterApp])
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.write('"NOT IMPLEMENTED"');
      res.end();
    });
    console.log(pkg.name);
    routes.get('/apps', function (req, res) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.write(JSON.stringify(store.get('allApps')));
      res.end();
    });
  }

  app = connect.createServer();
  app.use(xcors(corsOptions));
  server = app.listen(8899, function () {
    console.log("Listening at", server.address());
  });
  app.use('/' + pkg.name, connect.router(router));
}());
