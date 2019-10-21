'use strict';

module.exports = {
    isNumber,
    isString,
    isBundleId,
    isBoolean,
    functionName,
    isFunction,
    isOrder,
    isArray,
    isMatchmakingStrategy,
    isValidationImitate,
    isPlatformHeader,
    isSemVersion,
    isMapOfHmacSecrets,
    isIpAddress,
    isUriPrefix,
    isNotNullOrUndefined
};

var _ = require('lodash'),
    ipRegex = require('ip-regex');

const BUNDLE_ID_REGEXP = /^(?:[a-zA-Z]+(?:\d*[a-zA-Z_]*)*)(?:\.[a-zA-Z]+(?:\d*[a-zA-Z_]*)*)+$/,
    FUNCTION_NAME_REGEXP = /^[$A-Z_][0-9A-Z_$]*$/i,
    AVAILABLE_PLATFORMS = ['webvk', 'webok', 'webfb', 'android', 'ios', 'stdl'];

var ErrorResponse = require('../../objects/ErrorResponse.js');

function isNumber(value, valueHeader, from, to){
    if(value == null || !_.isNumber(value) || isNaN(value) || !Number.isSafeInteger(value)){
        throw new ErrorResponse(480, `Argument ${valueHeader} has invalid value`);
    }
    if(_.isNumber(from) && value < from){
        throw new ErrorResponse(481, `Argument ${valueHeader} went beyond allowed range`);
    }
    if(_.isNumber(to) && value > to){
        throw new ErrorResponse(482, `Argument ${valueHeader} went beyond allowed range`);
    }
}
function isString(value, valueHeader, lfrom, lto){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(458, `Argument ${valueHeader} has invalid value`);
    }
    if(_.isNumber(lfrom) && value.length < lfrom){
        throw new ErrorResponse(459, `Argument ${valueHeader} has invalid length`);
    }
    if(_.isNumber(lto) && value.length > lto){
        throw new ErrorResponse(483, `Argument ${valueHeader} has invalid length`);
    }
}
function isBundleId(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(484, `Argument ${valueHeader} has invalid value`);
    }
    if(!BUNDLE_ID_REGEXP.test(value)){
        throw new ErrorResponse(485, `Argument ${valueHeader} has invalid value`);
    }
}
function isBoolean(value, valueHeader){
    if(value == null || !_.isBoolean(value)){
        throw new ErrorResponse(460, `Argument ${valueHeader} has invalid value`);
    }
}
function functionName(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(461, `Argument ${valueHeader} has invalid value`);
    }
    if(value.length < 3 || value.length > 64){
        throw new ErrorResponse(486, `Argument ${valueHeader} has invalid length`);
    }
    if(!FUNCTION_NAME_REGEXP.test(value)){
        throw new ErrorResponse(487, `Argument ${valueHeader} has invalid value`);
    }
}
function isFunction(value, valueHeader){
    if(value == null || !_.isFunction(value)){
        throw new ErrorResponse(488, `Argument ${valueHeader} has invalid value`);
    }
}
function isOrder(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(492, `Argument ${valueHeader} has invalid value`);
    }
    if(value !== 'asc' && value !== 'desc'){
        throw new ErrorResponse(493, `Argument ${valueHeader} has invalid value`);
    }
}
function isArray(value, valueHeader, lfrom, lto){
    if(value == null || !Array.isArray(value)){
        throw new ErrorResponse(1089, `Argument ${valueHeader} has invalid value`);
    }
    if(_.isNumber(lfrom) && value.length < lfrom){
        throw new ErrorResponse(504, `Argument ${valueHeader} has invalid length`);
    }
    if(_.isNumber(lto) && value.length > lto){
        throw new ErrorResponse(833, `Argument ${valueHeader} has invalid length`);
    }
}
function isMatchmakingStrategy(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(834, `Argument ${valueHeader} has invalid value`);
    }
    if(value !== 'open' && value !== 'predefined'){
        throw new ErrorResponse(835, `Argument ${valueHeader} has invalid value`);
    }
}
function isValidationImitate(value, valueHeader){
    if(value == null || (value !== false && !_.isPlainObject(value))){
        throw new ErrorResponse(836, `Argument ${valueHeader} has invalid value`);
    }
    if(_.isBoolean(value)){
        if(value === true){
            throw new ErrorResponse(837, `Argument ${valueHeader} has invalid value`);
        }
    } else if(_.isPlainObject(value)){
        if(value.isValid == null || !_.isBoolean(value.isValid)){
            throw new ErrorResponse(838, `Argument ${valueHeader} has invalid format`);
        }
    } else {
        throw new ErrorResponse(839, `Argument ${valueHeader} has invalid type`);
    }
}
function isPlatformHeader(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(568, `Argument ${valueHeader} has invalid value`);
    }
    if(!AVAILABLE_PLATFORMS.includes(value)){
        throw new ErrorResponse(999, `Argument ${valueHeader} has invalid platform value`);
    }
}
function isSemVersion(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(1000, `Argument ${valueHeader} has invalid value`);
    }
    var _px = value.split('.');
    if(_px.length !== 3){
        throw new ErrorResponse(494, `Argument ${valueHeader} has invalid value of semantic version`);
    }
    for(let i = 0 ; i < _px.length ; i++){
        let _pxi = _px[i];
        if(!_pxi || (_pxi.startsWith('0') && _pxi.length > 1) || _pxi.startsWith('-') || _pxi.startsWith('+') || _pxi.startsWith('.')){
            throw new ErrorResponse(495, `Argument ${valueHeader} has invalid value of semantic version`);
        }
        let _pxii = +_pxi;
        if(!Number.isSafeInteger(_pxii) || _pxii < 0 || _pxii > 65000){
            throw new ErrorResponse(840, `Argument ${valueHeader} has invalid value of semantic version`);
        }
    }
}
function isMapOfHmacSecrets(value, valueHeader){
    if(value == null || !_.isPlainObject(value)){
        throw new ErrorResponse(496, `Argument ${valueHeader} has invalid value`);
    }
    var _keys = Object.keys(value);
    if(!_keys.length){
        throw new ErrorResponse(497, `Argument ${valueHeader} has invalid structure`);
    }
    for(let i = 0 ; i < _keys.length ; i++){
        let _k = _keys[i];
        isSemVersion(_k, `${valueHeader}.${_k}`);
        let _v = value[_k];
        isString(_v, `${valueHeader}.${_k}`, 1, 512);
    }
}
function isIpAddress(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(498, `Argument ${valueHeader} has invalid value`);
    }
    if(!ipRegex({ exact: true }).test(value) && !ipRegex.v6({ exact: true }).test(value)){
        throw new ErrorResponse(499, `Argument ${valueHeader} has invalid ip address value`);
    }
}
function isUriPrefix(value, valueHeader){
    if(value == null || !_.isString(value)){
        throw new ErrorResponse(663, `Argument ${valueHeader} has invalid value`);
    }
    if(value !== '' && !value.endsWith('/')){
        throw new ErrorResponse(662, `Argument ${valueHeader} has invalid uri prefix value`);
    }
}
function isNotNullOrUndefined(value, valueHeader){
    if(value == null){
        throw new ErrorResponse(500, `Argument ${valueHeader} has empty`);
    }
}