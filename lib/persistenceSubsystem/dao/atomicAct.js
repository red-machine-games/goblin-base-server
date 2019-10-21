'use strict';

module.exports = {
    init,
    createNew
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'atomicacts';

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
                    log.fatal(err);
                    callback(err);
                } else if(results.every(e => !_.isNull(e) && !_.isUndefined(e))){
                    blankSearch();
                } else {
                    let err = new ErrorResponse(859, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            async.series([
                cb => theCollection.createIndex({ hid: 1 }, { unique: true }, cb),
                cb => theCollection.createIndex({ tch: 1 }, cb),
                cb => theCollection.createIndex({ cat: 1 }, cb)
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
                hid: Joi.number().min(0).required(),
                tch: Joi.array().items(Joi.object().type(ObjectID)).required(),
                dat: Joi.object().required(),
                tarcp: Joi.string().required(),
                st: Joi.array().items(Joi.number().min(0).max(4)).required(),
                cat: Joi.number().min(0).required()
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
        let valid = Joi.validate(theDoc, JoiSchema),
            err = valid.error;
        if(!err && theDoc.tch.length !== theDoc.st.length){
            err = new Error('tch.length !== st.length');
        }
        return _.isNull(err);
    } else {
        return true;
    }
}