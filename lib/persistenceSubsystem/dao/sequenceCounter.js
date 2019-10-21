'use strict';

module.exports = {
    init,
    createNew,
    getNextSequenceValue
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'sequencecounters';

var _ = require('lodash'),
    daoUtils = require('./utils/daoUtils.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var Joi, JoiSchema;

var theCollection;

function init(database, autoIndex, callback){
    theCollection = database.collection(COLLECTION_NAME);

    function makeAnIndexes(){
        if(autoIndex){
            let callbackFn = (err, result) => {
                if(err){
                    log.fatal(err);
                    callback(err);
                } else if(!_.isNull(result) && !_.isUndefined(result)){
                    blankSearch();
                } else {
                    let err = new ErrorResponse(873, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            theCollection.createIndex({ name: 1 }, { unique: true }, callbackFn);
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
                name: Joi.string(),
                sequenceValue: Joi.number()
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
function getNextSequenceValue(sequenceName, sequenceShift, callback){
    let callbackFn = (err, result) => {
        if (err) {
            if(err.code === 11000 && err.codeName === 'DuplicateKey'){
                getNextSequenceValue(sequenceName, sequenceShift, callback);
            } else {
                log.error('Mongodb Error', { code: 929, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(929, err.message), null);
            }
        } else {
            callback(null, result.value.sequenceValue);
        }
    };

    theCollection.findOneAndUpdate(
        { name: sequenceName }, { $inc: { sequenceValue: sequenceShift }},
        { returnOriginal: false, upsert: true },
        callbackFn
    );
}

function nonProductionValidation(theDoc){
    if(Joi){
        let valid = Joi.validate(theDoc, JoiSchema);
        return _.isNull(valid.error);
    } else {
        return true;
    }
}