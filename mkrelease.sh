#!/bin/bash
TAR="/usr/bin/tar"
SERVER_DIR="../server"
CLIENT_DIR="./"
BROWSER_DIR="../browser"
BROWSER_RELEASE="../web-client"

usage() {
  echo -e "Usage: ${0} <semver>\n\ne.g.: ${0} v0.1.0\n The above will make a package at v0.1.0."
  exit 1
}
[ -z ${1} ] && usage
RELEASE=${1}

if [ -f "${SERVER_DIR}/public/releases/${RELEASE}/browser.tgz" ] 
then
  echo "You can't overwrite an existing version. Bailing..."
  exit 1
fi

/bin/mkdir -p ${SERVER_DIR}/public/releases/${RELEASE}
cd ${BROWSER_DIR}
./build.sh
cd - > /dev/null
rm -rf ${CLIENT_DIR}/public/
if [ ! -d "node_modules" ]
then
  npm install
fi
rsync -a ${BROWSER_RELEASE}/ ./public/
${TAR} -czf ${SERVER_DIR}/public/releases/${RELEASE}/browser.tgz .
rm -rf ${CLIENT_DIR}/public/

echo "Created ${SERVER_DIR}/public/releases/${RELEASE}/browser.tgz"
