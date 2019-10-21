'use strict';

class OkInappValidationConfig{
    constructor(items){
        this.iapItems = Array.isArray(items) ? items : Array.slice.call(arguments, 0);
    }
}

module.exports = OkInappValidationConfig;