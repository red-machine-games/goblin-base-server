'use strict';

class VkInappValidationConfig{
    constructor(items){
        this.iapItems = Array.isArray(items) ? items : Array.slice.call(arguments, 0);
    }
}

module.exports = VkInappValidationConfig;