'use strict';

const DEFAULT_SESSION_LIFETIME = 50 * 1000,
    DEFAULT_LAST_ACTION_TIMEOUT = 60 * 60 * 1000,
    DEFAULT_UNICORN_SALT = 'K9nesgpvPSb44VN6mx35Vn9Q',
    DEFAULT_G_CLIENT_ID_SALT = 'cg7DqfvjLuk6BusZZzwbSjVA',
    DEFAULT_G_SECRET_SALT = 'cMZQMsDRM84bbRSprDrvWKV5';

var validate = require('./utils/validateConfigs.js');

class AccountsConfig{
    constructor(opts){
        this.sessionLifetime = opts.sessionLifetime != null ? opts.sessionLifetime : DEFAULT_SESSION_LIFETIME;
        this.lastActionTimeout = opts.lastActionTimeout != null ? opts.lastActionTimeout : DEFAULT_LAST_ACTION_TIMEOUT;
        this.unicornSalt = opts.unicornSalt || DEFAULT_UNICORN_SALT;
        this.gClientIdSalt = opts.gClientIdSalt || DEFAULT_G_CLIENT_ID_SALT;
        this.gClientSecretSalt = opts.gClientSecretSalt || DEFAULT_G_SECRET_SALT;

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.sessionLifetime, 'sessionLifetime', 5000, 1000 * 60 * 10);
        validate.isNumber(this.lastActionTimeout, 'lastActionTimeout', 2000);
        validate.isString(this.unicornSalt, 'unicornSalt', 6, 64);
        validate.isString(this.gClientIdSalt, 'gClientIdSalt', 6, 64);
        validate.isString(this.gClientSecretSalt, 'gClientSecretSalt', 6, 64);
    }
}

module.exports = AccountsConfig;