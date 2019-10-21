'use strict';

const DEFAULT_IMITATE = false,
    DEFAULT_VERBOSE = false,
    DEFAULT_FORCE_SANDBOX_VALIDATION = false,
    DEFAULT_APPLE_EXCLUDE_OLD_TRANSACTIONS = false;

var validate = require('./utils/validateConfigs.js');

class MobileReceiptValidationConfig{
    constructor(opts){
        this.imitate = opts.imitate != null ? opts.imitate : DEFAULT_IMITATE;
        this.verbose = opts.verbose != null ? opts.verbose : DEFAULT_VERBOSE;
        this.forceSandbox = opts.forceSandbox != null ? opts.forceSandbox : DEFAULT_FORCE_SANDBOX_VALIDATION;
        this.appleExcludeOldTransactions = opts.appleExcludeOldTransactions != null
            ? opts.appleExcludeOldTransactions
            : DEFAULT_APPLE_EXCLUDE_OLD_TRANSACTIONS;

        this._validateIt();
    }
    _validateIt(){
        validate.isValidationImitate(this.imitate, 'imitate');
        validate.isBoolean(this.verbose, 'verbose');
        validate.isBoolean(this.forceSandbox, 'forceSandbox');
        validate.isBoolean(this.appleExcludeOldTransactions, 'appleExcludeOldTransactions');
    }
}

module.exports = MobileReceiptValidationConfig;