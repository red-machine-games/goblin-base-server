'use strict';

const THE_BUNDLE_ID = 'webok';

var validate = require('./utils/validateConfigs.js');

class OkInappItem{
    constructor(productCode, productOption, price){
        this.productCode = productCode;
        this.productOption = productOption;
        this.price = price;
        this.targetBundleId = THE_BUNDLE_ID;

        this._validateIt();
    }
    _validateIt(){
        validate.isString(this.productCode, 'productCode', 1);
        validate.isNumber(this.productOption, 'productOption', 0);
        validate.isNumber(this.price, 'price', 0);
        validate.isBundleId(this.targetBundleId, 'targetBundleId');
    }
}

module.exports = OkInappItem;