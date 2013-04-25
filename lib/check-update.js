(function () {
  "use strict";

  var request = require('ahr')
    , url = require('url')
    ;

  // Whatever we're updating, we should pass in the current version
  // Just in case that version can't be updated
  // TODO we should also pass the version of Web App Center
  function Updater(opts) {
    var me = this
      ;

    me.site = opts.site;
    // TODO this version should be the pending-update or current
    me.version = opts.version;
    me.channel = opts.channel;
    me.handleUpdate = opts.update;
    me.interval = Number(opts.interval) || 1 * 60 * 60 * 1000;

    me._intervalToken = setInterval(function () {
      me.check();
    }, me.interval);
    me.check();
  }
  Updater.prototype.check = function () {
    var me = this
      ;

    console.log('ver, ch', me.version, me.channel);
    request.get(me.site, { version: me.version, channel: me.channel }).when(function (err, ahr, result) {
      var metadata = result.result
        ;

      console.log(typeof metadata, metadata && metadata.href, 'metadata:', metadata);
      if (metadata && metadata.href) {
        // TODO ask the user if it's okay to restart?
        // or just don't build apps that can't handle a few seconds downtime?
        // The file size should also be in the metadata
        clearInterval(me._intervalToken);
        console.log('calling update');
        me.handleUpdate(url.resolve(me.site, metadata.href), metadata);
      }
    });
  };
  Updater.create = function (opts) {
    return new Updater(opts);
  };

  module.exports = Updater;
}());
