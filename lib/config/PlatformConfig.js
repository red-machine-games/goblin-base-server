'use strict';

const DEFAULT_PLATFORM_HEADER = 'stdl',
    DEFAULT_MINIMUM_VERSION = '0.0.0',
    DEFAULT_HMAC_SECRETS_MAP = { [DEFAULT_MINIMUM_VERSION]: 'default' };

var validate = require('./utils/validateConfigs.js');

class PlatformConfig{
    constructor(opts){
        this.header = opts.header || DEFAULT_PLATFORM_HEADER;
        this.minimumVersion = opts.minimumVersion || DEFAULT_MINIMUM_VERSION;
        this.hmacSecretsMap = opts.hmacSecretsMap || DEFAULT_HMAC_SECRETS_MAP;

        this._validateIt();
    }
    _validateIt(){
        validate.isPlatformHeader(this.header, 'header');
        validate.isSemVersion(this.minimumVersion, 'minimumVersion');
        validate.isMapOfHmacSecrets(this.hmacSecretsMap, 'hmacSecretsMap');
    }
}

module.exports = PlatformConfig;