'use strict';

module.exports = {
    runJob
};

var EventEmitter = require('events');

var theJobs = {};

function runJob(head, theJob, callback){
    function initTheSyncJob(){
        function callbackFn(){
            theJobs[head] = undefined;
            newEmitter.emit.apply(newEmitter, ['complete'].concat([...arguments]));
        }

        var newEmitter = new EventEmitter();
        newEmitter.setMaxListeners(Number.MAX_VALUE);
        theJobs[head] = newEmitter;
        theJob(callbackFn);
        newEmitter.once('complete', callback);
    }

    var syncE = theJobs[head];
    if(syncE){
        syncE.once('complete', callback);
    } else {
        initTheSyncJob();
    }
}