'use strict';

module.exports = {
    init,
    createNew
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const COLLECTION_NAME = 'tickets',
    DEFAULT_TICKET_LIFETIME_S = 1000,
    INDEX_OPTIONS_CONFLICT_CODENAME = 'IndexOptionsConflict';

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
                    tryToAddTtlIndex();
                } else {
                    let err = new ErrorResponse(586, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            async.series([
                cb => theCollection.createIndex({ sender: 1, ttlIndex: 1 }, cb),
                cb => theCollection.createIndex({ receiver: 1, ttlIndex: 1 }, cb),
                cb => theCollection.createIndex({ receiverVk: 1, ttlIndex: 1 }, cb),
                cb => theCollection.createIndex({ receiverFb: 1, ttlIndex: 1 }, cb),
                cb => theCollection.createIndex({ receiverOk: 1, ttlIndex: 1 }, cb),
                cb => theCollection.createIndex({ tid: 1 }, { unique: true }, cb)
            ], callbackFn);
        } else {
            blankSearch();
        }
    }
    function tryToAddTtlIndex(){
        const _ANTI_REC = 5;
        var _anti_rec_check = 0;

        var thatTtlIndexName;

        function _doTry(){
            let callbackFn = (err, result) => {
                if(err){
                    if(err.codeName === INDEX_OPTIONS_CONFLICT_CODENAME){
                        thatTtlIndexName = err.message.replace('Index with name: ', '').replace(' already exists with different options', '');
                        _removeExisting();
                    } else {
                        log.fatal(err);
                        callback(err);
                    }
                } else if(result){
                    blankSearch();
                } else {
                    let err = new ErrorResponse(884, 'Some database indexes were not created');
                    log.fatal(err);
                    callback(err);
                }
            };

            var expireAfterSeconds = DEFAULT_TICKET_LIFETIME_S;
            if(goblinBase.ticketsConfig){
                expireAfterSeconds = Math.floor(goblinBase.ticketsConfig.ticketLifetime / 1000);
            }
            theCollection.createIndex({ ttlIndex: 1 }, { expireAfterSeconds }, callbackFn)
        }
        function _removeExisting(){
            let callbackFn = err => {
                if(err){
                    log.error(err);
                    callback(err);
                } else {
                    _doTry();
                }
            };

            if(++_anti_rec_check === _ANTI_REC){
                let err = new ErrorResponse(875, 'Dropping prev. tickets ttl index unsuccessful');
                log.error(err);
                callback(err);
            } else {
                theCollection.dropIndex(thatTtlIndexName, callbackFn);
            }
        }

        _doTry();
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
                tid: Joi.number().min(0),
                sender: Joi.object().type(ObjectID),
                receiver: Joi.object().type(ObjectID),
                senderId: Joi.number().min(0).max(2147483647),
                receiverId: Joi.number().min(0).max(2147483647),
                receiverVk: Joi.string(),
                receiverOk: Joi.string(),
                receiverFb: Joi.string(),
                ticketHead: Joi.string(),
                payload: Joi.object(),
                cb: Joi.boolean(),
                sat: Joi.boolean(),
                ttlIndex: Joi.date()
            });
        }
        callback(null);
    }

    makeAnIndexes();
}
function createNew(theDoc, callback){
    if(!theDoc.ttlIndex){
        theDoc.ttlIndex = new Date();
    }
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