'use strict';

const TARGET_BUNDLE_ID = 'webvk';

var validate = require('./utils/validateConfigs.js');

class VkInappItem{
    constructor(opts){
        this.itemId = opts.itemId;
        this.title = opts.title;
        this.photoUrl = opts.photoUrl;
        this.price = opts.price;
        this.targetBundleId = TARGET_BUNDLE_ID;

        this._validateIt();
    }
    _validateIt(){
        validate.isString(this.itemId, 'itemId', 1);
        validate.isString(this.title, 'title', 1);
        validate.isString(this.photoUrl, 'photoUrl', 1);
        validate.isNumber(this.price, 'price', 0);
        validate.isBundleId(this.targetBundleId, 'targetBundleId');
    }
}

module.exports = VkInappItem;