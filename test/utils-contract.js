'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

var runMediator = require('../lib/generalUtils/runMediator.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    it('Should test mediator with 1', done => {
        let callbackFn = (arg) => {
            expect(arg).to.be.equal('arg');
            done();
        };

        runMediator.runJob('testo', cb => setTimeout(() => cb('arg'), 1000), callbackFn);
    });
    it('Should test mediator with N', done => {
        const N = 1000;

        var theCounter = 0;

        var theJob = callback => {
            theCounter++;
            setTimeout(() => callback(null, 'arg1', 'arg2'), 1000);
        };

        var callbackFn = (err, manyArgs) => {
            expect(err).to.be.a('null');

            for(let i = 0 ; i < N ; i++){
                expect(manyArgs[i][0]).to.be.equal('arg1');
                expect(manyArgs[i][1]).to.be.equal('arg2');
            }

            expect(theCounter).to.be.equal(1);

            done();
        };

        var asyncJobs = [];
        _(N).times(() => asyncJobs.push(cb => runMediator.runJob('testo', theJob, cb)));
        async.parallel(asyncJobs, callbackFn);
    });
    it('Should test mediator with random calls', done => {
        const HERE_N_IS = 10,
            ACTS_FOR_EACH = 50;

        var doneCounter = 0;

        var callbackFn = err => {
            if(err){
                done(err);
            } else if(++doneCounter === HERE_N_IS){
                done();
            }
        };

        var apiIsCurrentlyWorking = false;
        var someAsyncAPI = callback => {
            if(apiIsCurrentlyWorking){
                callback(new Error('WTF!'));
            } else {
                apiIsCurrentlyWorking = true;
                setTimeout(() => {
                    apiIsCurrentlyWorking = false;
                    callback(null, 'some value');
                }, _.random(100, 300));
            }
        };

        _(HERE_N_IS).times(() => (() => {
            var _act = 0;
            var _do = () => {
                if(++_act === ACTS_FOR_EACH){
                    callbackFn();
                } else {
                    setTimeout(() => {
                        runMediator.runJob(null, someAsyncAPI, (err, arg) => {
                            if(arg === 'some value'){
                                _do();
                            } else {
                                callbackFn(new Error('WTF 2'));
                            }
                        });
                    }, _.random(1, 100));
                }
            };
            _do();
        })());
    });
});
describe('After stuff', () => {
    it('Should do clean', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});