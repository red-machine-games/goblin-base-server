'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    stableSort = require('stable'),
    MersenneTwister = require('mersennetwister'),
    faker = require('faker'),
    deepEqual = require('fast-deep-equal'),
    EloRank = require('elo-rank');

const goblinBase = require('../../index.js').getGoblinBase();

var originalNow = _.now,
    theElo = new EloRank(32);

// Compares two arrays not paying attention to their order
_.compareArraysWhateverOrder = function(array1, array2){
    assert(array1, 'Array 1 must be provided');
    assert(_.isArray(array1), 'Array 1 must be an array');
    assert(array2, 'Array 2 must be provided');
    assert(_.isArray(array2), 'Array 2 must be an array');

    if(array1.length !== array2.length){
        return false;
    } else if(array1.length === 0 && array2.length === 0){
        return true;
    }

    var clone1 = _.clone(array1),
        clone2 = _.clone(array2);

    while(clone1.length > 0 && clone2.length > 0){
        let sample1 = clone1.pop(),
            sample2 = null;

        if(_.isObject(sample1)){
            sample1 = _.clone(sample1);
        }

        for(let j = 0 ; j < clone2.length ; j++){
            sample2 = clone2[j];

            if(_.isObject(sample2)){
                sample2 = _.clone(sample2);
            }

            if(_.isEqual(sample1, sample2)){
                clone2.splice(j, 1);
                break;
            } else {
                sample2 = null;
            }
        }

        if(_.isNull(sample2)){
            return false;
        }
    }

    return (clone1.length === clone2.length);
};

_.simpleFirstLevelDiff = function(original, modified){
    assert(_.isObject(original), 'Original object must be an object');
    assert(_.isObject(modified), 'Modified object must be an object');

    var a = [], m = [], d = [], out = {};

    // find adds and mods
    _.each(modified, (v, k) => {
        if(_.isUndefined(original[k])){
            a.push(k);
        } else if(!_.isEqual(original[k], v)){
            m.push(k);
        }
    });

    // find dels
    _.each(original, (v, k) => {
        if(_.isUndefined(modified[k])){
            d.push(k);
        }
    });

    if(!_.isEmpty(a)){
        out.a = a;
    }
    if(!_.isEmpty(m)){
        out.m = m;
    }
    if(!_.isEmpty(d)){
        out.d = d;
    }

    return _.size(out) > 0 ? out : null;
};

_.lowerCase = function(obj, keyIgnoreCase, defaultValue) {
    assert(obj, 'Object must be provided');
    assert(_.isObject(obj), 'Object must be a type of object');
    assert(keyIgnoreCase, 'Key must be provided');
    assert(_.isString(keyIgnoreCase), 'Key must be a type of string');

    let _key = keyIgnoreCase.toLowerCase();

    for (let prop in obj) {
        if (obj.hasOwnProperty(prop) && prop.toLowerCase() === _key) {
            return obj[prop];
        }
    }

    return defaultValue;
};

// 0.19999999999999998 => 0.2
_.mrProper = function(doubleVal){
    assert(_.isNumber(doubleVal), 'doubleVal must be type of Number');

    var x1 = doubleVal.toFixed(2).split('.'),
        x2 = Math.round(parseFloat(x1[1][0] + '.' + x1[1][1]));
    doubleVal = parseFloat(x1[0] + '.' + x2.toString());

    return doubleVal;
};

// Returns random element from collection "collection"
_.randE = function(collection){
    assert(collection, 'Collection must be provided');
    assert(_.isArray(collection), 'Collection must be an array');
    assert(!_.isEmpty(collection), 'Collection must be non-empty');

    return collection[_.random(0, collection.length - 1)];
};

// The same as randE but multiple values
_.randE_Multiple = function(collection, howMuch){
    assert(collection, 'Collection must be provided');
    assert(_.isArray(collection), 'Collection must be an array');
    assert(!_.isEmpty(collection), 'Collection must be non-empty');
    assert(_.isNumber(howMuch), 'howMuch should be a number');
    assert(!isNaN(howMuch) && howMuch >= 1 && howMuch <= collection.length, 'howMuch should be positive and limited by collection');

    if(howMuch === 1){
        return [_.randE(collection)];
    } else {
        let out = collection.slice();
        if(collection.length > howMuch){
            for(let i = collection.length - howMuch ; i >= 0 ; i--){
                out.splice(_.random(0, out.length - 1), 1);
            }
        }
        return out;
    }
};

// Same as sortBy function, but using stable sort instead of native js Array.sort()
_.stableSortBy = function(array, iteratee, ascending){
    assert(!_.isUndefined(array) && !_.isNull(array), 'Array must be defined');
    if(!_.isBoolean(ascending)){
        ascending = true;
    }

    if(_.isUndefined(iteratee) || _.isNull(iteratee) || !_.isFunction(iteratee)){
        return array;
    }

    return stableSort.inplace(array, (a, b) => {
        if(ascending){
            return iteratee(a) > iteratee(b);
        } else {
            return iteratee(a) < iteratee(b);
        }
    });
};

// Same as "stableSortBy" but returning new sorted array leaving original array untouched
_.stableSortByCopy = function(array, iteratee, ascending){
    assert(!_.isUndefined(array) && !_.isNull(array), 'Array must be defined');
    if(!_.isBoolean(ascending)){
        ascending = true;
    }

    if(_.isUndefined(iteratee) || _.isNull(iteratee) || !_.isFunction(iteratee)){
        return array;
    }

    return stableSort(array, (a, b) => {
        if(ascending){
            return iteratee(a) > iteratee(b);
        } else {
            return iteratee(a) < iteratee(b);
        }
    });
};

//remove fields which starts with "$" or has regexp value
_.withoutBadFields = function(object) {
    _.forEach(object, (value, key) => {
        if (typeof key === 'string' && (key.trim() !== key || key.slice(0, 1) === '$')) {
            delete object[key];
        } else if (_.isRegExp(value)) {
            delete object[key];
        } else if (typeof value === 'object' && !_.isEmpty(value)) {
            object[key] = _.withoutBadFields(value);
        }
    });
    return object;
};

//get next day 00:00 UTC +0 timestamp
_.getNextMidnight = function() {
    let date = new Date();
    let expire = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return Date.parse(expire);
};

// It parses int value and if output is NaN so null returns
_.parseIntOrNull = function(val){
    var out = parseInt(val);

    return isNaN(out) ? null : out;
};

// Compare semantic versions. For example: 0.1.0 >= 0.0.9
_.compareVersionsGte = function(version1, version2){
    var ver1digits = version1.split('.').map(e => _.parseIntOrNull(e)),
        ver2digits = version2.split('.').map(e => _.parseIntOrNull(e));

    if(ver1digits.length !== ver2digits.length){
        return false;
    }

    var i = 0;
    while(true){
        if(ver1digits[i] < ver2digits[i]){
            return false;
        } else if(ver1digits[i] === ver2digits[i]){
            if(++i === ver1digits.length){
                return true;
            }
        } else {
            return true;
        }
    }
};

// Getting property from object by key ignoring case. Undefined if nothing found
_.getPropIgnoreCase = function(obj, keyIgnoreCase, defaultValue){
    assert(obj, 'Object must be provided');
    assert(_.isObject(obj), 'Object must be a type of object');
    assert(keyIgnoreCase, 'Key must be provided');
    assert(_.isString(keyIgnoreCase), 'Key must be a type of string');

    var _key = keyIgnoreCase.toLowerCase();

    for(let prop in obj){
        if(obj.hasOwnProperty(prop) && prop.toLowerCase() === _key){
            return obj[prop];
        }
    }

    return defaultValue;
};

// Sanitize mongodb url
_.sanitizeDbUrlWithCredentials = function(url) {
    var prt1 = url.split('@');
    if(prt1.length !== 2){
        return url;
    }
    var prt2 = prt1[0].split('//');
    if(prt2.length !== 2){
        return null;
    }
    var prt3 = prt2[0].split(':');
    if(prt3.length !== 2){
        return null;
    }
    var count = prt3[1].length;

    var asterisks = '';
    _.times(count, () => asterisks += '*');

    return prt2[0].concat('//', prt3[0], ':', asterisks, '@', prt1[1]);
};

_.checkSpecialMongodbSymbols = function(q){
    if(_.isPlainObject(q)){
        for(let k in q){
            if(q.hasOwnProperty(k)){
                if(k.trim() !== k || k.includes('$')){
                    return true;
                } else if(_.isObject(q[k])){
                    return _.checkSpecialMongodbSymbols(q[k]);
                } else if(_.isRegExp(q[k])){
                    return true;
                }
            }
        }
    }
    return false;
};

_.isoToTimestamp = function(isoDateStr){
    return Math.floor(new Date(isoDateStr).getTime() / 1000);
};

_.coinFlip = function(){
    return Math.round(Math.random()) === 1;
};

_.checkObjectHasSomeOfKeys = function(sourceObject, keysArray){
    assert(_.isObject(sourceObject), 'sourceObject must be an object');
    assert(_.isArray(keysArray) && keysArray.length, 'keysArray must be an array with values');

    for(let i = 0 ; i < keysArray.length ; i++){
        if(!_.isUndefined(sourceObject[keysArray[i]]) && !_.isNull(sourceObject[keysArray[i]])){
            return true;
        }
    }
    return false;
};

_.cleanObject = function(object){
    _.forEach(object, (value, key) => {
        if (typeof value === 'object' && !_.isEmpty(value)) {
            object[key] = _.cleanObject(value);
        } else if (typeof value === 'string'){
            let v = value.split('_');
            if (v.length === 2 && v[1] === 'asString'){
                object[key] = v[0];
            } else if (!isNaN(value)){
                object[key] = Number(value);
            } else if (value === 'TRUE' || value === 'FALSE') {
                object[key] = value === 'TRUE';
            }
        }
    });

    return object;
};

_.fakeObject = function(seed){
    faker.seed(seed);

    var mt = new MersenneTwister(seed),
        hits = Math.ceil(mt.realx() * 50),
        out = {},
        cursor = out;

    _(hits).times(() => {
        var theHit = mt.real() * 100;

        if(theHit >= 0 && theHit < 15){
            // Go deeper
            let newNodeName = faker.random.word();
            cursor[newNodeName] = {};
            cursor = cursor[newNodeName];
        } else if(theHit >= 15){
            // Place a value
            cursor[faker.random.word()] = faker.random.word();
        }
    });

    return out;
};

_.fakeObjectOrReal = function(seed){
    faker.seed(seed);

    var mt = new MersenneTwister(seed),
        objOrReal = Math.round(mt.real());

    if(objOrReal){
        let hits = Math.ceil(mt.realx() * 50),
            out = {},
            cursor = out;

        _(hits).times(() => {
            var theHit = mt.real() * 100;

            if(theHit >= 0 && theHit < 15){
                // Go deeper
                let newNodeName = faker.random.word();
                cursor[newNodeName] = {};
                cursor = cursor[newNodeName];
            } else if(theHit >= 15){
                // Place a value
                cursor[faker.random.word()] = faker.random.word();
            }
        });
        return out;
    } else {
        return _.callRandomFunction(faker.random, mt);
    }
};

_.callRandomFunction = function(holder, mersenneTwister){
    var functions = [];
    for(let f in holder){
        if(holder.hasOwnProperty(f) && _.isFunction(holder[f])){
            functions.push(() => holder[f]());
        }
    }

    assert(functions.length > 0, 'There should be functions');

    var randomFuncI = Math.floor(mersenneTwister.rnd() * functions.length);

    return functions[randomFuncI]();
};

_.firstOr = function(target){
    return target.length ? _.first(target) : target;
};

_.lastOr = function(target){
    return target.length ? _.last(target) : target;
};

_.allTheSame = function(arr, lambda){
    assert(Array.isArray(arr), 'First argument should be array');
    assert(_.isFunction(lambda), 'Second argument should be a function');
    if(arr.length > 1){
        let val = lambda(arr[0]);
        for(let i = 1 ; i < arr.length ; i++){
            if(!deepEqual(lambda(arr[i]), val)){
                return false;
            }
        }
    }
    return true;
};

_.isPromise = function(target){
    return target instanceof Promise;
};

// Overriding underscore's now function
_.now = function() {
    return originalNow() + goblinBase._globalNowTimeDelta;
};

// Check whatever provided function is async
_.isAsyncFunction = function(target){
    return _.isFunction(target) ? target.toString().startsWith('async ') : false;
};

_.eloGetExpected = function(playerA, playerB){
    return theElo.getExpected(playerA, playerB);
};
_.eloUpdateRating = function(expected, actual, current){
    return theElo.updateRating(expected, actual, current);
};

_.callerAbsolutePath = function(){
    var originalPrepStackTrace = Error.prepareStackTrace;

    var callerfileAbs;
    try {
        let err = new Error(),
            currentfile;

        Error.prepareStackTrace = function (err, stack) { return stack; };

        let theStack = err.stack;
        theStack.shift();

        currentfile = theStack.shift().getFileName();

        while (theStack.length) {
            callerfileAbs = theStack.shift().getFileName();

            if(currentfile !== callerfileAbs) break;
        }
    } catch (e) {}

    Error.prepareStackTrace = originalPrepStackTrace;

    return callerfileAbs;
};