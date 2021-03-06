'use strict';

var _ = require('lodash'),
    scUtils = require('./sharingCodeUtils.js');

const LODASH_UTILITIES_WHITE_LIST = {
    compareArraysWhateverOrder: 1,
    mrProper: 1,
    randE: 1,
    stableSortBy: 1,
    stableSortByCopy: 1,
    compareVersionsGte: 1,
    getPropIgnoreCase: 1,
    coinFlip: 1,
    firstOr: 1,
    lastOr: 1,
    isPromise: 1,
    getNextMidnight: 1,
    eloGetExpected: 1,
    eloUpdateRating: 1,
    now: 1,
    chunk: 1,
    compact: 1,
    concat: 1,
    difference: 1,
    differenceBy: 1,
    differenceWith: 1,
    drop: 1,
    dropRight: 1,
    dropRightWhile: 1,
    dropWhile: 1,
    fill: 1,
    findIndex: 1,
    findLastIndex: 1,
    first: 1,
    flatten: 1,
    flattenDeep: 1,
    flattenDepth: 1,
    fromPairs: 1,
    head: 1,
    indexOf: 1,
    initial: 1,
    intersection: 1,
    intersectionBy: 1,
    intersectionWith: 1,
    join: 1,
    last: 1,
    lastIndexOf: 1,
    nth: 1,
    pull: 1,
    pullAll: 1,
    pullAllBy: 1,
    pullAllWith: 1,
    pullAt: 1,
    remove: 1,
    reverse: 1,
    slice: 1,
    sortedIndex: 1,
    sortedIndexBy: 1,
    sortedIndexOf: 1,
    sortedLastIndex: 1,
    sortedLastIndexBy: 1,
    sortedLastIndexOf: 1,
    sortedUniq: 1,
    sortedUniqBy: 1,
    tail: 1,
    take: 1,
    takeRight: 1,
    takeRightWhile: 1,
    takeWhile: 1,
    union: 1,
    unionBy: 1,
    unionWith: 1,
    uniq: 1,
    uniqBy: 1,
    uniqWith: 1,
    unzip: 1,
    unzipWith: 1,
    without: 1,
    xor: 1,
    xorBy: 1,
    xorWith: 1,
    zip: 1,
    zipObject: 1,
    zipObjectDeep: 1,
    zipWith: 1,
    countBy: 1,
    each: 1,
    eachRight: 1,
    every: 1,
    filter: 1,
    find: 1,
    findLast: 1,
    flatMap: 1,
    flatMapDeep: 1,
    flatMapDepth: 1,
    forEach: 1,
    forEachRight: 1,
    groupBy: 1,
    includes: 1,
    invokeMap: 1,
    keyBy: 1,
    map: 1,
    orderBy: 1,
    partition: 1,
    reduce: 1,
    reduceRight: 1,
    reject: 1,
    sample: 1,
    sampleSize: 1,
    shuffle: 1,
    size: 1,
    some: 1,
    sortBy: 1,
    castArray: 1,
    clone: 1,
    cloneDeep: 1,
    cloneDeepWith: 1,
    cloneWith: 1,
    conformsTo: 1,
    eq: 1,
    gt: 1,
    gte: 1,
    isArguments: 1,
    isArray: 1,
    isArrayBuffer: 1,
    isArrayLike: 1,
    isArrayLikeObject: 1,
    isBoolean: 1,
    isBuffer: 1,
    isDate: 1,
    isElement: 1,
    isEmpty: 1,
    isEqual: 1,
    isEqualWith: 1,
    isError: 1,
    isFinite: 1,
    isFunction: 1,
    isInteger: 1,
    isLength: 1,
    isMap: 1,
    isMatch: 1,
    isMatchWith: 1,
    isNaN: 1,
    isNative: 1,
    isNil: 1,
    isNull: 1,
    isNumber: 1,
    isObject: 1,
    isObjectLike: 1,
    isPlainObject: 1,
    isRegExp: 1,
    isSafeInteger: 1,
    isSet: 1,
    isString: 1,
    isSymbol: 1,
    isTypedArray: 1,
    isUndefined: 1,
    isWeakMap: 1,
    isWeakSet: 1,
    lt: 1,
    lte: 1,
    toArray: 1,
    toFinite: 1,
    toInteger: 1,
    toLength: 1,
    toNumber: 1,
    toPlainObject: 1,
    toSafeInteger: 1,
    toString: 1,
    add: 1,
    ceil: 1,
    divide: 1,
    floor: 1,
    max: 1,
    maxBy: 1,
    mean: 1,
    meanBy: 1,
    min: 1,
    minBy: 1,
    multiply: 1,
    round: 1,
    subtract: 1,
    sum: 1,
    sumBy: 1,
    clamp: 1,
    inRange: 1,
    random: 1,
    assign: 1,
    assignIn: 1,
    assignInWith: 1,
    assignWith: 1,
    at: 1,
    create: 1,
    defaults: 1,
    defaultsDeep: 1,
    entries: 1,
    entriesIn: 1,
    extend: 1,
    extendWith: 1,
    findKey: 1,
    findLastKey: 1,
    forIn: 1,
    forInRight: 1,
    forOwn: 1,
    forOwnRight: 1,
    functions: 1,
    functionsIn: 1,
    get: 1,
    has: 1,
    hasIn: 1,
    invert: 1,
    invertBy: 1,
    invoke: 1,
    keys: 1,
    keysIn: 1,
    mapKeys: 1,
    mapValues: 1,
    merge: 1,
    mergeWith: 1,
    omit: 1,
    omitBy: 1,
    pick: 1,
    pickBy: 1,
    result: 1,
    set: 1,
    setWith: 1,
    toPairs: 1,
    toPairsIn: 1,
    transform: 1,
    unset: 1,
    update: 1,
    updateWith: 1,
    values: 1,
    valuesIn: 1,
    camelCase: 1,
    capitalize: 1,
    deburr: 1,
    endsWith: 1,
    escape: 1,
    escapeRegExp: 1,
    kebabCase: 1,
    lowerCase: 1,
    lowerFirst: 1,
    pad: 1,
    padEnd: 1,
    padStart: 1,
    parseInt: 1,
    repeat: 1,
    replace: 1,
    snakeCase: 1,
    split: 1,
    startCase: 1,
    startsWith: 1,
    template: 1,
    toLower: 1,
    toUpper: 1,
    trim: 1,
    trimEnd: 1,
    trimStart: 1,
    truncate: 1,
    unescape: 1,
    upperCase: 1,
    upperFirst: 1,
    words: 1
};
const LODASH_WHITE_LIST_ARRAY = Object.keys(LODASH_UTILITIES_WHITE_LIST);

const SHARED_CODE_UTILITIES_WHITE_LIST = {
    Clamp_0: 1,
    Clamp_1: 1,
    RandomNextUInt: 1,
    StableSort: 1,
    StableSortByParam: 1,
    StableSortByItem: 1
};
const SHARED_CODE_WHITE_LIST_ARRAY = Object.keys(SHARED_CODE_UTILITIES_WHITE_LIST);

var lodashProxy = new Proxy(_, {
    getOwnPropertyDescriptor: () => undefined,
    ownKeys: target => {
        if(target === _){
            return LODASH_WHITE_LIST_ARRAY;
        }
    },
    defineProperty: () => false,
    deleteProperty: () => false,
    preventExtensions: () => false,
    has: (target, name) => {
        if(target === _){
            return !!LODASH_UTILITIES_WHITE_LIST[name];
        }
    },
    get: (target, name, receiver) => {
        if(target === _ && receiver === lodashProxy && LODASH_UTILITIES_WHITE_LIST[name]){
            return _[name];
        }
    },
    set: () => false,
    apply: () => undefined,
    construct: () => undefined
});

var sharingCodeUtilsProxy = new Proxy(scUtils, {
    getOwnPropertyDescriptor: () => undefined,
    ownKeys: target => {
        if(target === scUtils){
            return SHARED_CODE_WHITE_LIST_ARRAY;
        }
    },
    defineProperty: () => false,
    deleteProperty: () => false,
    preventExtensions: () => false,
    has: (target, name) => {
        if(target === scUtils){
            return !!SHARED_CODE_UTILITIES_WHITE_LIST[name];
        }
    },
    get: (target, name, receiver) => {
        if(target === _ && receiver === sharingCodeUtilsProxy && SHARED_CODE_UTILITIES_WHITE_LIST[name]){
            return _[name];
        }
    },
    set: () => false,
    apply: () => undefined,
    construct: () => undefined
});

module.exports = {
    lodashProxy,
    sharingCodeUtilsProxy
};