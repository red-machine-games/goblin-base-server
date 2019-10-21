'use strict';

var _ = require('lodash');

const HEADER_NAME = 'X-Benchmark-Intervals';

class LaTimer {
    constructor(){
        this._leTableWithTimestamps = {};
    }
    leStart(intervalHead){
        if(!this._leTableWithTimestamps[intervalHead]){
            this._leTableWithTimestamps[intervalHead] = { start: _.now() }
        }
    }
    leFinish(intervalHead){
        if(this._leTableWithTimestamps[intervalHead]){
            this._leTableWithTimestamps[intervalHead].finish = _.now();
        }
    }
    injectResultIntoHeader(res){
        var out = [];

        _.each(this._leTableWithTimestamps, (v, k) => {
            if(v.start && v.finish){
                out.push(k + ':' + (v.finish - v.start));
            }
        });

        res.setHeader(HEADER_NAME, out.join(','));
    }
    justPrintResults(prefix){
        var out = [];

        _.each(this._leTableWithTimestamps, (v, k) => {
            if(v.start && v.finish){
                out.push(k + ':' + (v.finish - v.start));
            }
        });

        console.log(`${prefix ? prefix : ''} :: ${out.join(',')}`);
    }
}

module.exports = {
    LaTimer
};