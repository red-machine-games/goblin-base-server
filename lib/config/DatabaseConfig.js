'use strict';

const DEFAULT_CONNECTION_URL = 'mongodb://localhost:27017/dev',
    DEFAULT_AUTO_UNDEX = true,
    DEFAULT_POOL_SIZE = 5,
    DEFAULT_WRITE_CONCERN = 1,
    DEFAULT_JOURNAL_CONCERN = true,
    DEFAULT_WTIMEOUT = 15 * 1000,
    DEFAULT_DEV_NEW_DOC_VALIDATION = true;

var validate = require('./utils/validateConfigs.js');

class DatabaseConfig{
    constructor(opts){
        this.connectionUrl = opts.connectionUrl || DEFAULT_CONNECTION_URL;
        this.autoIndex = opts.autoIndex || DEFAULT_AUTO_UNDEX;
        this.poolSize = opts.poolSize || DEFAULT_POOL_SIZE;
        this.writeConcern = opts.writeConcern || DEFAULT_WRITE_CONCERN;
        this.journalConcern = opts.journalConcern || DEFAULT_JOURNAL_CONCERN;
        this.wtimeout = opts.wtimeout || DEFAULT_WTIMEOUT;
        this.devNewDocValidation = opts.devNewDocValidation || DEFAULT_DEV_NEW_DOC_VALIDATION;

        this._validateIt();
    }
    _validateIt(){
        validate.isString(this.connectionUrl, 'connectionUrl', 4);
        validate.isBoolean(this.autoIndex, 'autoIndex');
        validate.isNumber(this.poolSize, 'poolSize', 1, 512);
        validate.isNumber(this.writeConcern, 'writeConcern', 0, 512);
        validate.isBoolean(this.journalConcern, 'journalConcern');
        validate.isNumber(this.wtimeout, 'wtimeout', 1000);
        validate.isBoolean(this.devNewDocValidation, 'devNewDocValidation');
    }
}

module.exports = DatabaseConfig;