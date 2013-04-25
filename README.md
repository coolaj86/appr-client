WebAppsCenter Client
===

This is the client, written in NodeJS, that connects to WebAppsCenter

Installation
---

  0. Use Installer at [hurpdurp.com](http://hurpdurp.com)

Alternate Installation
---

  0. Install [NodeJS](http://nodejs.org#download)
  1. Open a Terminal (or `cmd.exe`)
  2. Run `npm install -g webappscenter-client`
  3. Register `webappscenter-client` as a system service
      * TODO: `webappscenter-client-register-service`

Pushing a new client version to the server
---

    node deploy

API
===

  `GET /alive`
  `GET /applist`
  `GET /installed`
  `POST /install/:appid`
  `POST /delete/:appid`

Desired API
---

  `GET /uptime`
  `GET /version`

  `GET /apps`
  `GET /apps/:appid`

  `GET /installs`
  `GET /installs/:appid`
  `POST /installs/:appid`
  `DELETE /installs/:appid`
