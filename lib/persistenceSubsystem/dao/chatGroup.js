'use strict';

module.exports = {
    init,
    createNew
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'chatgroups';

var _ = require('lodash'),
    async = require('async');

var daoUtils = require('./utils/daoUtils.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var Joi, JoiSchema;

var theCollection;

function init(database, autoIndex, callback){
    theCollection = database.collection(COLLECTION_NAME);

    function makeAnIndexes(){
        if(autoIndex){
            let callbackFn = (err, results) => {
                if(err){
                    log.fatal(err);
                    callback(err);
                } else if(results.every(e => !_.isNull(e) && !_.isUndefined(e))){
                    blankSearch();
                } else {
                    let err = new ErrorResponse(1099, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            async.series([
                cb => theCollection.createIndex({ head: 1 }, cb)
            ], callbackFn);
        } else {
            blankSearch();
        }
    }
    function blankSearch(){
        let callbackFn = err => {
            if(err){
                log.error(err);
                callback(err);
            } else {
                makeValidationSchema();
            }
        };

        daoUtils.linkCollectionFuncsWithModule(module, theCollection);
        theCollection.find({}, { limit: 1 }).toArray(callbackFn);
    }
    function makeValidationSchema(){
        if(goblinBase.databaseConfig.devNewDocValidation){
            Joi = require('joi');
            JoiSchema = Joi.object().keys({
                head: Joi.string().min(4).max(32).required()
            });
        }
        callback(null);
    }

    makeAnIndexes();
}
function createNew(theDoc, callback){
    if(nonProductionValidation(theDoc)){
        let callbackFn = (err, result) => {
            if(err){
                callback(err, result);
            } else if(result.insertedCount === 1){
                callback(null, result.ops[0]);
            } else {
                callback(null, null);
            }
        };

        theCollection.insertOne(theDoc, callbackFn)
    } else {
        callback(new Error('Non-production doc validation failed'));
    }
}

function nonProductionValidation(theDoc){
    if(Joi){
        let valid = Joi.validate(theDoc, JoiSchema);
        return _.isNull(valid.error);
    } else {
        return true;
    }
}