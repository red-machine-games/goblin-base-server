'use strict';

const DEFAULT_PVE_BATTLE_TIMEOUT = 1000 * 60 * 2,
    DEFAULT_PVE_BATTLE_DEBT_TIMEOUT = 1000 * 60 * 60 * 24 * 7,
    DEFAULT_PACK_JSON_MODEL = false;

var validate = require('./utils/validateConfigs.js');

class SimplePveConfig{
    constructor(opts){
        this.pveBattleTimeout = opts.pveBattleTimeout != null ? opts.pveBattleTimeout : DEFAULT_PVE_BATTLE_TIMEOUT;
        this.pveBattleDebtTimeout = opts.pveBattleDebtTimeout != null ? opts.pveBattleDebtTimeout : DEFAULT_PVE_BATTLE_DEBT_TIMEOUT;
        this.packJsonModel = opts.packJsonModel != null ? opts.packJsonModel : DEFAULT_PACK_JSON_MODEL;

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.pveBattleTimeout, 'pveBattleTimeout', 1);
        validate.isNumber(this.pveBattleDebtTimeout, 'pveBattleDebtTimeout', 1);
        validate.isBoolean(this.packJsonModel, 'packJsonModel');
    }
}

module.exports = SimplePveConfig;