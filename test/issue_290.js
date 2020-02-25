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

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    const N = 50,
        SHIFT = 2;

    var unicorns = [], hids = [], pids = [];

    var someSequence = 2;

    describe('Let\'s imagine that we are VK guy and made an in-app recently', () => {
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
        it('Should add new VK in-app supposedly bought', done => {
            let callbackFn = err => {
                expect(err).to.be.equal(null);

                done();
            };

            VkPurchase.createNew({
                purchNum: 1, itemId: '1',
                pid: pids[0], orderId: 1,
                isConsumed: false,
                cat: Math.floor(_.now() / 1000)
            }, callbackFn);
        });
        it('Should list it', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('purchaseNum', 1);
                expect(body[0]).to.have.property('itemId', '1');
                expect(body[0]).to.have.property('isConsumed', false);
                expect(body[0]).to.have.property('createdAt');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[0], callbackFn);
        });
        it('VK guy should consume that in-app', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.consumePurchase', { purchasenum: 1 }, unicorns[0], callbackFn);
        });
        it('VK guy should try to consume that in-app again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1086, 'Already consumed purchase'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.consumePurchase', { purchasenum: 1 }, unicorns[0], callbackFn);
        });
        it('VK guy should try to consume nonexistent in-app', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1087, 'Unknown purchase'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.consumePurchase', { purchasenum: 2 }, unicorns[0], callbackFn);
        });
    });
    describe('Let\'s imagine that we are OK guy and made an in-app recently', () => {
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
        it('Should add new OK in-app supposedly bought', done => {
            let callbackFn = err => {
                expect(err).to.be.equal(null);

                done();
            };

            OkPurchase.createNew({
                purchNum: 1, txid: '1',
                pcode: '123', popt: '321',
                pid: pids[1], isConsumed: false,
                cat: Math.floor(_.now() / 1000)
            }, callbackFn);
        });
        it('Should list it', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('purchaseNum', 1);
                expect(body[0]).to.have.property('productCode', '123');
                expect(body[0]).to.have.property('isConsumed', false);
                expect(body[0]).to.have.property('createdAt');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[1], callbackFn);
        });
        it('OK guy should consume that in-app', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.consumePurchase', { purchasenum: 1 }, unicorns[1], callbackFn);
        });
        it('OK guy should try to consume that in-app again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1083, 'Already consumed purchase'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.consumePurchase', { purchasenum: 1 }, unicorns[1], callbackFn);
        });
        it('OK guy should try to consume nonexistent in-app', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1084, 'Unknown purchase'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.consumePurchase', { purchasenum: 2 }, unicorns[1], callbackFn);
        });
    });
    describe(`Work with more ~${N / 2} guys`, () => {
        _((N - unicorns.length) / 2).times(n => {
            n += SHIFT;

            var purchaseNumFrom;

            it(`Should signup VK guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorns.push(body.unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { vktoken: n }, null, null, callbackFn);
            });
            it(`Should create new profile #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: n + 1, mmr: 0, ver: 1, wlRate: 0, vk: n + '' });

                    hids.push(body.humanId);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
            it('Get this guy\'s pid', done => {
                let callbackFn = (err, theDoc) => {
                    expect(err).to.be.equal(null);
                    expect(theDoc).to.not.equal('null');

                    pids.push(theDoc._id.toString());

                    done();
                };

                Profile.findOne({ humanId: hids[n] }, { projection: { _id: 1 } }, callbackFn);
            });
            it('Should remember purchaseNumFrom', () => {
                purchaseNumFrom = someSequence + 1;
            });
            _(N).times(n2 => {
                it(`Should add new VK in-app #${n2 + 1} supposedly bought for guy #${n}`, done => {
                    let callbackFn = err => {
                        expect(err).to.be.equal(null);

                        done();
                    };

                    someSequence++;
                    VkPurchase.createNew({
                        purchNum: someSequence, itemId: someSequence + '',
                        pid: pids[n], orderId: someSequence,
                        isConsumed: false,
                        cat: Math.floor(_.now() / 1000)
                    }, callbackFn);
                });
            });
            it(`Should get first VK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(20);

                    for(let i = 0 ; i < 20 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[n], callbackFn);
            });
            it(`Should get second VK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(20);

                    for(let i = 0 ; i < 20 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.listPurchases', { offset: 20, limit: 20 }, unicorns[n], callbackFn);
            });
            it(`Should get third VK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(10);

                    for(let i = 0 ; i < 10 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'vkJobs.listPurchases', { offset: 40, limit: 20 }, unicorns[n], callbackFn);
            });
        });
        _((N - unicorns.length) / 2).times(n => {
            n += SHIFT + N / 2;

            var purchaseNumFrom;

            it(`Should signup OK guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorns.push(body.unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { oktoken: n }, null, null, callbackFn);
            });
            it(`Should create new profile #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: n + 1, mmr: 0, ver: 1, wlRate: 0, ok: n + '' });

                    hids.push(body.humanId);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
            it('Get this guy\'s pid', done => {
                let callbackFn = (err, theDoc) => {
                    expect(err).to.be.equal(null);
                    expect(theDoc).to.not.equal('null');

                    pids.push(theDoc._id.toString());

                    done();
                };

                Profile.findOne({ humanId: hids[n] }, { projection: { _id: 1 } }, callbackFn);
            });
            it('Should remember purchaseNumFrom', () => {
                purchaseNumFrom = someSequence + 1;
            });
            _(N).times(n2 => {
                it(`Should add new OK in-app #${n2 + 1} supposedly bought for guy #${n}`, done => {
                    let callbackFn = err => {
                        expect(err).to.be.equal(null);

                        done();
                    };

                    someSequence++;
                    OkPurchase.createNew({
                        purchNum: someSequence, txid: someSequence + '',
                        pcode: '123', popt: '321',
                        pid: pids[n], isConsumed: false,
                        cat: Math.floor(_.now() / 1000)
                    }, callbackFn);
                });
            });
            it(`Should get first OK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(20);

                    for(let i = 0 ; i < 20 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.listPurchases', { offset: 0, limit: 20 }, unicorns[n], callbackFn);
            });
            it(`Should get second OK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(20);

                    for(let i = 0 ; i < 20 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.listPurchases', { offset: 20, limit: 20 }, unicorns[n], callbackFn);
            });
            it(`Should get third OK purchase page for guy #${n}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.length).to.be.equal(10);

                    for(let i = 0 ; i < 10 ; i++){
                        expect(body[i].purchaseNum).to.be.equal(purchaseNumFrom++);
                    }

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'okJobs.listPurchases', { offset: 40, limit: 20 }, unicorns[n], callbackFn);
            });
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