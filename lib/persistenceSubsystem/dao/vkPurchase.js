'use strict';

module.exports = {
    init,
    createNew
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'vkpurchases';

var _ = require('lodash'),
    async = require('async'),
    daoUtils = require('./utils/daoUtils.js');

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
                    let err = new ErrorResponse(781, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            async.series([
                cb => theCollection.createIndex({ orderId: 1 }, { unique: true }, cb),
                cb => theCollection.createIndex({ pid: 1 }, cb),
                cb => theCollection.createIndex({ purchNum: 1 }, { unique: true }, cb)
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
                purchNum: Joi.number().min(0),
                itemId: Joi.string().min(1).max(10),
                pid: Joi.string().length(24),
                orderId: Joi.number(),
                isConsumed: Joi.boolean(),
                cat: Joi.number().min(0)
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