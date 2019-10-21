'use strict';

const PLATFORM_PLUS_VERSION_HEADER = 'X-Platform-Version',
    PLATFORM_WEB_VK = 'webvk',
    PLATFORM_WEB_OK = 'webok',
    PLATFORM_WEB_FB = 'webfb',
    PLATFORM_ANDROID = 'android',
    PLATFORM_IOS = 'ios',
    PLATFORM_STANDALONE = 'stdl';

module.exports = {
    doCheck,
    doCheckInternal,
    onlyMobile,

    PLATFORM_WEB_VK,
    PLATFORM_WEB_OK,
    PLATFORM_WEB_FB,
    PLATFORM_ANDROID,
    PLATFORM_IOS,
    PLATFORM_STANDALONE,
    PLATFORM_PLUS_VERSION_HEADER
};

const goblinBase = require('../../index.js').getGoblinBase();

const SEMVER_REGEXP = /^(\d+\.)?(\d+\.)?(\*|\d+)$/,
    ALL_PLATFORMS = [PLATFORM_WEB_VK, PLATFORM_WEB_OK, PLATFORM_WEB_FB, PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_STANDALONE];

var _ = require('lodash');

var ErrorResponse = require('../objects/ErrorResponse.js');

function doCheck(req, res, next){
    let callbackFn = (err, platform, version) => {
        if(err){
            res.code(400).send(err);
        } else {
            req.clientPlatform = platform;
            req.clientVersion = version;
            next();
        }
    };

    doCheckInternal(req.headers, callbackFn);
}
function doCheckInternal(headers, callback){
    if(!goblinBase.platformPlusVersionCheck){
        callback(null, null, null);
    } else {
        let platformPlusVersion = _.getPropIgnoreCase(headers, PLATFORM_PLUS_VERSION_HEADER);

        if(platformPlusVersion && _.isString(platformPlusVersion)){
            platformPlusVersion = platformPlusVersion.split(';');
            let platformHeader = platformPlusVersion[0],
                version = platformPlusVersion[1],
                versionToCompare;

            if(platformHeader && version && SEMVER_REGEXP.test(version)){
                let platform = goblinBase.platforms.find(e => e.header === platformHeader);
                if(!platform){
                    if(ALL_PLATFORMS.includes(platformHeader)){
                        return callback(new ErrorResponse(949, `This platform is unsupported`), null, null);
                    } else {
                        return callback(new ErrorResponse(403, `Invalid ${PLATFORM_PLUS_VERSION_HEADER} platform`), null, null);
                    }
                }
                versionToCompare = platform.minimumVersion;

                if(_.compareVersionsGte(version, versionToCompare)){
                    callback(null, platformHeader, version);
                } else {
                    callback(new ErrorResponse(404, `Go update!`), null, null);
                }
            } else {
                callback(new ErrorResponse(405, `Invalid ${PLATFORM_PLUS_VERSION_HEADER} header`), null, null);
            }
        } else {
            callback(new ErrorResponse(406, `No ${PLATFORM_PLUS_VERSION_HEADER} header!`), null, null);
        }
    }
}
function onlyMobile(req, res, next){
    if(req.clientPlatform === PLATFORM_ANDROID || req.clientPlatform === PLATFORM_IOS){
        next();
    } else {
        res.code(400).send(new ErrorResponse(407, 'Only available for mobile versions'));
    }
}