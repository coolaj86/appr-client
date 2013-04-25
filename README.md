
Keep the last 3 versions or so?

    ./webappcenter/
        package.json
        server.js
        main/
            1.1.3
            1.1.2
            1.0.13
        apps/
            {appname}/{ver}/
        badversions.json
        history.json
            {
              {appname}: [{ver}, {ver}]
            }

make installable via grunt-contrib-copy (aka rsync)

    npm pack
