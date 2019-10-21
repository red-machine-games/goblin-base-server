'use strict';

module.exports = {
    requireCloudFunctions,
    setupExtensions
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const DOT_JS = '.js',
    NAME_REGEXP = /^[$A-Z_][0-9A-Z_$]*$/i,
    INIT_CONTEXT_FUNCTION = require('./CF_Code.js').INIT_CONTEXT_FUNCTION,
    BANNED_CUSTOM_FUNCTION_NAMES = goblinBase.cloudFunctionsConfig.allowToPushInitContext ? ['all'] : [INIT_CONTEXT_FUNCTION, 'all'],
    RESERVED_CF_NAMES = require('./CF_Code.js').RESERVED_CF_NAMES,
    SPECIAL_CODE_MARK = '/* THIS IS A SPECIAL CODE MARK F3eafS5S4ejdRBnxZeLfCt9B */',
    BANNED_EXTENSION_NAMES = ['hasOwnProperty'],
    CF_ARGS = [
        'getProfileNode', 'getSomeProfileNode', 'getPublicProfileNode', 'setProfileNode', 'setSomeProfileNode',
        'getSelfRating', 'setSelfRating', 'getSomeonesRating', 'setSomeonesRating', 'getSelfRatings',
        'checkForBattleDebts', 'matchmaking', 'defineGlobal', 'CreateNewProfileResponse',
        'MutateProfileResponse', 'PveInitResponse', 'PveActResponse', 'PveFinalizeResponse', 'FunctionResponse',
        'PvpResponse', 'PvpMessageHandler', 'PvpConnectionHandler', 'PvpDisconnectionHandler', 'PvpAutoDefeatResponse',
        'OnMatchmakingResponse', 'runtimeVersions', 'selfHumanId', 'now', 'args', 'session', 'clientParams', 'glob',
        'validateStoreReceipt', '_', 'utils', 'resources', 'trace', 'appendBattleJournalPve', 'appendSelfBattleJournalPve',
        'appendBattleJournalPvp', 'lock', 'relock', 'checkIsBot', 'run', 'access', 'setTimeout', 'log', 'extensionsAPI'
    ].join(',');

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    async = require('async');

var CF_Code = require('./CF_Code.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

function requireCloudFunctions(inquiries, callback){
    let callbackFn = (err, importedModules) => {
        if(err){
            callback(err);
        } else {
            let newFuncs = {};
            _.each(importedModules, imp => newFuncs[imp.cfName] = imp.importedModule);
            CF_Code.insertNewFunctions(newFuncs, callback);
        }
    };

    var asyncJobs = [];
    _.each(inquiries, inq => asyncJobs.push(cb => requireSingleCF(inq.path, cb)));
    async.series(asyncJobs, callbackFn);
}
function requireSingleCF(absolutePath, callback){
    var cfName, codeContent, originalContent;

    function checkFnName(){
        cfName = path.basename(absolutePath).split(DOT_JS).join('');
        if(!cfName || !NAME_REGEXP.test(cfName)){
            let errMessage = `Cloud function ${path.basename(absolutePath)} won't load: invalid name`;
            log.fatal(errMessage);
            return callback(new ErrorResponse(119, errMessage));
        }
        if(RESERVED_CF_NAMES.includes(cfName) || BANNED_CUSTOM_FUNCTION_NAMES.includes(cfName)){
            let errMessage = `Cloud function ${path.basename(absolutePath)} won't load: unacceptable name`;
            log.fatal(errMessage);
            return callback(new ErrorResponse(120, errMessage));
        }
        readTargetFile();
    }
    function readTargetFile(){
        let callbackFn = (err, content) => {
            if(err){
                log.fatal(`Cloud function ${cfName} won't load: ${err.message}`);
                callback(err);
            } else {
                codeContent = String(content);
                if(!codeContent){
                    let errMessage = `Cloud function ${path.basename(absolutePath)} won't load: invalid content`;
                    log.fatal(errMessage);
                    callback(new ErrorResponse(121, errMessage));
                } else {
                    appendAndPersist();
                }
            }
        };

        fs.readFile(absolutePath, callbackFn);
    }
    function appendAndPersist(){
        if(codeContent.includes(SPECIAL_CODE_MARK)){
            recoverOriginalCode();
        } else {
            let callbackFn = err => {
                if(err){
                    log.fatal(`Cloud function ${cfName} won't load: ${err.message}`);
                    callback(err);
                } else {
                    importTheCodeAndRecover();
                }
            };

            originalContent = codeContent;
            codeContent = `${SPECIAL_CODE_MARK}module.exports = (async function(${CF_ARGS}){${SPECIAL_CODE_MARK}${originalContent}${SPECIAL_CODE_MARK}}).bind(null);${SPECIAL_CODE_MARK}`;
            fs.writeFile(absolutePath, codeContent, { encoding: 'utf8', flag: 'w' }, callbackFn);
        }
    }
    function recoverOriginalCode(){
        originalContent = codeContent
            .split(SPECIAL_CODE_MARK)
            .filter(e => !!e)
            .map((e, i) => ((i + 1) % 2) ? null : e)
            .filter(e => e !== null)
            .join('');
        importTheCodeAndRecover();
    }
    function importTheCodeAndRecover(){
        let callbackFn = err => {
            if(err){
                log.fatal(`Cloud function ${cfName} won't load: ${err.message}`);
                callback(err);
            } else {
                callback(null, { importedModule, cfName });
            }
        };

        var importedModule = require(absolutePath);
        fs.writeFile(absolutePath, originalContent, { encoding: 'utf8', flag: 'w' }, callbackFn)
    }

    checkFnName();
}
function setupExtensions(methodsList){
    function checkNames(){
        for(let i = 0 ; i < methodsList.length ; i++){
            let _methodName = methodsList[i].methodName;
            if(!_methodName || !NAME_REGEXP.test(_methodName) || BANNED_EXTENSION_NAMES.includes(_methodName)){
                let errMessage = `Cloud functions extension "${_methodName}" won't load: invalid name`;
                log.fatal(errMessage);
                throw new ErrorResponse(122, errMessage);
            }
        }
        addExtensions();
    }
    function addExtensions(){
        var extensions = {};
        for(let i = 0 ; i < methodsList.length ; i++){
            extensions[methodsList[i].methodName] = methodsList[i].methodItself;
        }
        CF_Code.insertExtensions(extensions);
    }

    checkNames();
}