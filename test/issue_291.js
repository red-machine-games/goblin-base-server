'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

var Profile = require('../lib/persistenceSubsystem/dao/profile.js'),
    VkPurchase = require('../lib/persistenceSubsystem/dao/vkPurchase.js'),
    OkPurchase = require('../lib/persistenceSubsystem/dao/okPurchase.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    const N = 5,
        STRANGE_SHIFT = 32;

    var unicorns = [], hids = [], pids = [];

    describe('Check VK guy', () => {
        it('Should signup VK guy', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { vktoken: 1 }, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 1, mmr: 0, ver: 1, wlRate: 0, vk: '1' });

                hids.push(body.humanId);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
        });
        it('Get this guy\'s pid', done => {
            let callbackFn = (err, theDoc) => {
                expect(err).to.be.equal(null);
                expect(theDoc).to.not.equal('null');

                pids.push(theDoc._id.toString());

                done();
            };

            Profile.findOne({ humanId: hids[0] }, { projection: { _id: 1 } }, callbackFn);
        });
        _(N).times(n => {
            it(`Should add new VK in-app supposedly bought (with purchase num ${n + STRANGE_SHIFT})`, done => {
                let callbackFn = err => {
                    expect(err).to.be.equal(null);

                    done();
                };

                VkPurchase.createNew({
                    purchNum: n + STRANGE_SHIFT, itemId: n + STRANGE_SHIFT + '',
                    pid: pids[0], orderId: n + STRANGE_SHIFT,
                    isConsumed: true,
                    cat: Math.floor(_.now() / 1000)
                }, callbackFn);
            });
        });
        it('Should list em', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.length).to.be.equal(N);

                for(let i = 0 ; i < N ; i++){
                    expect(body[i]).to.have.property('purchaseNum', i + STRANGE_SHIFT);
                }

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[0], callbackFn);
        });
    });
    describe('Check OK guy', () => {
        it('Should signup OK guy', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { oktoken: 2 }, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 2, mmr: 0, ver: 1, wlRate: 0, ok: '2' });

                hids.push(body.humanId);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[1], callbackFn);
        });
        it('Get this guy\'s pid', done => {
            let callbackFn = (err, theDoc) => {
                expect(err).to.be.equal(null);
                expect(theDoc).to.not.equal('null');

                pids.push(theDoc._id.toString());

                done();
            };

            Profile.findOne({ humanId: hids[1] }, { projection: { _id: 1 } }, callbackFn);
        });
        _(N).times(n => {
            it(`Should add new VK in-app supposedly bought (with purchase num ${n + N + STRANGE_SHIFT})`, done => {
                let callbackFn = err => {
                    expect(err).to.be.equal(null);

                    done();
                };

                OkPurchase.createNew({
                    purchNum: n + N + STRANGE_SHIFT, txid: n + N + STRANGE_SHIFT + '',
                    pcode: '123', popt: '321',
                    pid: pids[1], isConsumed: true,
                    cat: Math.floor(_.now() / 1000)
                }, callbackFn);
            });
        });
        it('Should list em', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.length).to.be.equal(N);

                for(let i = 0 ; i < N ; i++){
                    expect(body[i]).to.have.property('purchaseNum', i + N + STRANGE_SHIFT);
                }

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[1], callbackFn);
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