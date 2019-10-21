'use strict';

module.exports = {
    callScript
};

const NO_SCRIPT_ERROR_CODE = 'NOSCRIPT';

let ReplyError = require('redis').ReplyError;

function callScript(redisClient, script, keys, callback){
    function tryEvalsha(){
        let callbackFn = (err, response) => {
            if(err){
                if(err instanceof ReplyError && err.code === NO_SCRIPT_ERROR_CODE){
                    tryEval();
                } else {
                    callback(err, null);
                }
            } else {
                callback(null, response);
            }
        };

        redisClient.evalshaWithArray(script.sha, keys, callbackFn);
    }

    function tryEval(){
        let callbackFn = (err, response) => {
            if(err){
                callback(err, null);
            } else {
                callback(null, response);
            }
        };

        redisClient.evalWithArray(script.script, keys, callbackFn);
    }

    tryEvalsha();
}