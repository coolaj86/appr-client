(function () {
  "use strict";

  module.exports =
    { "masterOrigins":
        [ "localhost:3000"
        ] 
    , "masterApp":
        { "scopes": ['fs', 'http', 'net', 'child_process']
        , "channel": "stable"
        , "origin": "http://localhost:8899"
        }
    };
}());
