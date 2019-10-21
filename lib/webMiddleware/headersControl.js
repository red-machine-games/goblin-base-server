'use strict';

module.exports = cacheControlAndStuff;

const CONTENT_TYPE = 'application/json';

var apiVersion = require('../../package.json').version;

function cacheControlAndStuff(req, res, next){
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-API-Version", apiVersion);
    res.setHeader('Content-Type', CONTENT_TYPE);

    next();
}