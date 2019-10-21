'use strict';

const DEFAULT_DISALLOW_DIRECT_PROFILE_EXPOSURE = false,
    DEFAULT_DISALLOW_DIRECT_PVP_MATCHMAKING_EXPOSURE = false,
    DEFAULT_DISALLOW_DIRECT_CHAT_AND_GROUPS_EXPOSURE = false;

var validate = require('./utils/validateConfigs.js');

class AuthoritarianConfig{
    constructor(opts){
        this.disallowDirectProfileExposure = opts.disallowDirectProfileExposure != null
            ? opts.disallowDirectProfileExposure
            : DEFAULT_DISALLOW_DIRECT_PROFILE_EXPOSURE;
        this.disallowDirectPvpMatchmakingExposure = opts.disallowDirectPvpMatchmakingExposure != null
            ? opts.disallowDirectPvpMatchmakingExposure
            : DEFAULT_DISALLOW_DIRECT_PVP_MATCHMAKING_EXPOSURE;
        this.disallowDirectChatAndGroupsExposure = opts.disallowDirectChatAndGroupsExposure != null
            ? opts.disallowDirectChatAndGroupsExposure
            : DEFAULT_DISALLOW_DIRECT_CHAT_AND_GROUPS_EXPOSURE;

        this._validateIt();
    }
    _validateIt(){
        validate.isBoolean(this.disallowDirectProfileExposure, 'disallowDirectProfileExposure');
        validate.isBoolean(this.disallowDirectPvpMatchmakingExposure, 'disallowDirectPvpMatchmakingExposure');
        validate.isBoolean(this.disallowDirectChatAndGroupsExposure, 'disallowDirectChatAndGroupsExposure');
    }
}

module.exports = AuthoritarianConfig;