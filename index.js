'use strict';

const GoblinBase = require('./lib/GoblinBase.js');

var goblinBaseSingleton = null;

module.exports = {
    getGoblinBase: () => {
        if(!goblinBaseSingleton || goblinBaseSingleton._stopped){
            goblinBaseSingleton = new GoblinBase();
        }
        return goblinBaseSingleton;
    }
};

var platformPlusVersionCheck = require('./lib/webMiddleware/platformPlusVersionCheck.js');

module.exports.PLATFORMS = {
    WEB_VK: platformPlusVersionCheck.PLATFORM_WEB_VK,
    WEB_OK: platformPlusVersionCheck.PLATFORM_WEB_OK,
    WEB_FB: platformPlusVersionCheck.PLATFORM_WEB_FB,
    ANDROID: platformPlusVersionCheck.PLATFORM_ANDROID,
    IOS: platformPlusVersionCheck.PLATFORM_IOS,
    STANDALONE: platformPlusVersionCheck.PLATFORM_STANDALONE
};
module.exports.RedisConfig = require('./lib/config/RedisConfig.js');
module.exports.GooglePlayCredentials = require('./lib/config/GooglePlayCredentials.js');
module.exports.OkInappItem = require('./lib/config/OkInappItem.js');
module.exports.VkInappItem = require('./lib/config/VkInappItem.js');