'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    request = require('request');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    var allowPublicListingCached;

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            allowPublicListingCached = goblinBase.leaderboardsConfig.allowPublicListing;
            goblinBase.leaderboardsConfig.allowPublicListing = true;
        });
    });

    const N = 30;

    var unicorns = [];

    describe('Adding players', () => {
        _(N).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorns.push(_unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
            it(`Should post rating in segment "segm1" #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: n + 1,
                    segment: 'segma'
                }, null, unicorns[n], callbackFn);
            });
            it(`Should set player public profile data #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                    publicProfileData: { thisPlayerNum: n }
                }, unicorns[n], callbackFn);
            });
        });
    });
    describe('Listing stuff', () => {
        it('Should publicly list records from 1 to 20', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                body = JSON.parse(body);

                expect(body).to.have.property('records');
                expect(body.records.length).to.be.equal(20);
                expect(body).to.have.property('len', N);

                for(let i = 0 ; i < 20 ; i++){
                    expect(body.records[i]).to.deep.equal({ hid: N - i, score: N - i, pdata: { thisPlayerNum: N - i - 1 } });
                }

                done();
            };

            request(
                `http://${START_AT_HOST}:${START_AT_PORT}/api/v0/pub.getLeadersOverall?skip=0&limit=20&segment=segma`,
                callbackFn
            );
        });
        it('Should publicly list records from 21 to 30', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                body = JSON.parse(body);

                expect(body).to.have.property('records');
                expect(body.records.length).to.be.equal(10);
                expect(body).to.have.property('len', N);

                for(let i = 0 ; i < 10 ; i++){
                    expect(body.records[i]).to.deep.equal({ hid: N - i - 20, score: N - i - 20, pdata: { thisPlayerNum: N - i - 1 - 20 } });
                }

                done();
            };

            request(
                `http://${START_AT_HOST}:${START_AT_PORT}/api/v0/pub.getLeadersOverall?skip=20&limit=20&segment=segma`,
                callbackFn
            );
        });
    });

    describe('Stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.leaderboardsConfig.allowPublicListing = allowPublicListingCached;
        });
    });
});
describe('After stuff', () => {
    it('Should clean utils cache', () => {
        testUtils.clearCache();
    });
    it('Should do clean', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});