'use strict';

module.exports = {
    init,
    theDo
};

var _ = require('lodash');

var refreshes,
    whirligig = 0;

function init(){
    var leaderboards = require('../features/leaderboards/leaderboards.js'),
        profiles = require('../features/accountsAndProfiles/profiles.js'),
        atomicActs = require('../features/atomic/atomicActs.js'),
        metrics = require('../generalUtils/metricsForStatsD.js');

    refreshes = [
        leaderboards.tryToRefreshRecords,
        profiles.tryToRefreshUnlinkedProfiles,
        atomicActs.atomicActsLoop,
        metrics.tryToMeasureCCU
    ];
}

function theDo(__, res, next){
    let callbackFn = err => {
        if(err){
            res.code(500).send(err);
        } else {
            next();
        }
    };

    do{
        if(whirligig >= refreshes.length){
            whirligig = 0;
        }

        var soHowRefreshed = refreshes[whirligig](_.now(), callbackFn);

        whirligig++;
    } while(soHowRefreshed === false);
}