'use strict';

module.exports = {
    Clamp_0,
    Clamp_1,
    RandomNextUInt,
    UnsafeRandom,
    StableSort,
    StableSortByParam,
    StableSortByItem
};

var _ = require('lodash'),
    MersenneTwister = require('mersennetwister');

function Clamp_0(value, min, max){
    return Math.max(min, Math.min(max, value));
}
function Clamp_1(value, min, max){
    return Math.max(min, Math.min(max, value));
}
function RandomNextUInt(initSeed, counter){
    var mt = new MersenneTwister(initSeed);

    _(counter).times(() => mt.int());

    return mt.int();
}
function UnsafeRandom(from, to){
    return _.random(from, to);
}
function StableSort(array, lambda, isAscending){
    _.stableSortBy(array, lambda, isAscending);
}
function StableSortByParam(array, paramName, isAscending){
    _.stableSortBy(array, e => e[paramName], isAscending);
}
function StableSortByItem(array, isAscending){
    _.stableSortBy(array, e => e, isAscending);
}