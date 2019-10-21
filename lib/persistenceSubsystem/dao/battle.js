'use strict';

module.exports = {
    init,
    createNew
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'battles',
    INDEX_OPTIONS_CONFLICT_CODE_NAME = 'IndexOptionsConflict';

var _ = require('lodash'),
    async = require('async'),
    daoUtils = require('./utils/daoUtils.js'),
    ObjectID = require('mongodb').ObjectID;

var ErrorResponse = require('../../objects/ErrorResponse.js');

var Joi, JoiSchema;

var theCollection;

function init(database, autoIndex, callback){
    theCollection = database.collection(COLLECTION_NAME);

    function makeAnIndexes(){
        if(autoIndex){
            let callbackFn = (err, results) => {
                if(err){
                    if(err.codeName === INDEX_OPTIONS_CONFLICT_CODE_NAME){
                        rebuildIndexes();
                    } else {
                        log.fatal(err);
                        callback(err);
                    }
                } else if(results.every(e => !_.isNull(e) && !_.isUndefined(e))){
                    blankSearch();
                } else {
                    let err = new ErrorResponse(860, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            async.series([
                cb => theCollection.createIndex({ hid: 1 }, { unique: true }, cb),
                cb => theCollection.createIndex({ pida: 1 }, cb),
                cb => theCollection.createIndex({ pidb: 1 }, cb),
                cb => theCollection.createIndex({ cat: -1 }, cb),
                cb => theCollection.createIndex({ pida: 1, cat: 1 }, { unique: true }, cb)
            ], callbackFn);
        } else {
            blankSearch();
        }
    }
    function rebuildIndexes(){
        let callbackFn = (err, results) => {
            if(err){
                log.fatal(err);
                callback(err);
            } else if(results.every(e => !_.isNull(e) && !_.isUndefined(e))){
                blankSearch();
            } else {
                let err = new ErrorResponse(862, 'Some database indexes were not created');
                log.fatal(err);
                callback(err);
            }
        };

        async.series([
            cb => theCollection.dropIndex('hid_1', cb),
            cb => theCollection.createIndex({ hid: 1 }, { unique: true }, cb)
        ], callbackFn);
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
                hid: Joi.number().min(0),
                auto: Joi.boolean(),
                pida: Joi.object().type(ObjectID),
                pidb: Joi.object().type(ObjectID),
                dsp: Joi.object(),
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