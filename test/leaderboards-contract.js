'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    crypto = require('crypto'),
    crc32 = require('crc-32');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

const VK_TEST_CLIENT_ID = require('./!testEntryPoint.js').VK_TEST_CLIENT_ID,
    VK_TEST_CLIENT_SECRET = require('./!testEntryPoint.js').VK_TEST_CLIENT_SECRET;

const OVERRIDE_PLATFORM_VK = require('../index.js').PLATFORMS.WEB_VK,
    OVERRIDE_PLATFORM_FB = require('../index.js').PLATFORMS.WEB_FB;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    describe('Refreshing VK friends', () => {
        const VK_FRIENDS = ['345', '678', '91011', '121314'].join(','),
            VK_FRIENDS_UPDATED = ['345', '678', '91011', '121314', '151617'].join(',');

        var vksecret, vkId = '123', unicorn;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should generate secret', () => {
            vksecret = crypto.createHash('md5').update(
                Buffer.from(`${VK_TEST_CLIENT_ID}_${vkId}_${VK_TEST_CLIENT_SECRET}`), 'binary'
            ).digest('hex');
        });
        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                vkid: vkId,
                vksecret
            }, null, null, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should check VK friends crc', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal({ index: 159, message: 'No friends hash' });

                done();
            };

            let vkFriendsHash = crc32.str(VK_FRIENDS);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', {
                friendsCrc: vkFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should refresh VK friends', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', null, {
                friends: VK_FRIENDS
            }, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should check VK friends crc', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            let vkFriendsHash = crc32.str(VK_FRIENDS);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', {
                friendsCrc: vkFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should check updated VK friends crc', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal({ index: 158, message: 'Wrong friends hash' });

                done();
            };

            let vkFriendsHash = crc32.str(VK_FRIENDS_UPDATED);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', {
                friendsCrc: vkFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should refresh vk friends', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', null, {
                friends: VK_FRIENDS_UPDATED
            }, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should check updated VK friends crc', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            let vkFriendsHash = crc32.str(VK_FRIENDS_UPDATED);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', {
                friendsCrc: vkFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_VK);
        });
    });
    describe('Refreshing FB friends', () => {
        const FB_FRIENDS = ['345', '678', '91011', '121314'].join(','),
            FB_FRIENDS_UPDATED = ['345', '678', '91011', '121314', '151617'].join(',');

        var fbId = '123', unicorn;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                fbtoken: fbId
            }, null, null, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should check fb friends crc', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal({ index: 168, message: 'No friends hash' });

                done();
            };

            let fbFriendsHash = crc32.str(FB_FRIENDS);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', {
                friendsCrc: fbFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should refresh fb friends', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', null, {
                friends: FB_FRIENDS
            }, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should check fb friends crc', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            let fbFriendsHash = crc32.str(FB_FRIENDS);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', {
                friendsCrc: fbFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should check updated fb friends crc', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal({ index: 167, message: 'Wrong friends hash' });

                done();
            };

            let fbFriendsHash = crc32.str(FB_FRIENDS_UPDATED);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', {
                friendsCrc: fbFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should refresh fb friends', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', null, {
                friends: FB_FRIENDS_UPDATED
            }, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should check updated fb friends crc', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            let fbFriendsHash = crc32.str(FB_FRIENDS_UPDATED);
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', {
                friendsCrc: fbFriendsHash
            }, null, unicorn, callbackFn, OVERRIDE_PLATFORM_FB);
        });
    });
    describe('Posting a record', () => {
        var vksecret, vkId = '123', fbId = '123',
            unicorn1, unicorn2;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should generate secret', () => {
            vksecret = crypto.createHash('md5').update(
                Buffer.from(`${VK_TEST_CLIENT_ID}_${vkId}_${VK_TEST_CLIENT_SECRET}`), 'binary'
            ).digest('hex');
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                vkid: vkId,
                vksecret
            }, null, null, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                fbtoken: fbId
            }, null, null, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should post record for first player in segment A', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 13,
                segment: 'segma'
            }, null, unicorn1, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should post record for first player in segment B', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 37,
                segment: 'segmb'
            }, null, unicorn1, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should get first player\'s record from segment A', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ rec: 13, rank: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segma'
            }, unicorn1, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should get first player\'s record from segment B', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ rec: 37, rank: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segmb'
            }, unicorn1, callbackFn, OVERRIDE_PLATFORM_VK);
        });
        it('Should post record for second player in segment A', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 3,
                segment: 'segma'
            }, null, unicorn2, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should post record for second player in segment B', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 22,
                segment: 'segmb'
            }, null, unicorn2, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should get second player\'s record from segment A', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ rec: 3, rank: 2 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segma'
            }, unicorn2, callbackFn, OVERRIDE_PLATFORM_FB);
        });
        it('Should get second player\'s record from segment B', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ rec: 22, rank: 2 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segmb'
            }, unicorn2, callbackFn, OVERRIDE_PLATFORM_FB);
        });
    });
    describe('Getting overall leaders', () => {
        const N = 21;

        var vkSecrets, vkIds, fbIds, vkUnicorns, fbUnicorns;

        var vkPlayersHumanIds = [],
            fbPlayersHumanIds = [];

        var recordsCacheSegmentA = [],
            recordsCacheSegmentB = [];

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should generate vk ids and calculate vk secrets and stuff', () => {
            vkIds = [];
            vkUnicorns = [];
            vkSecrets = [];
            _(N).times(n => {
                var _vkId = '' + (++n) + (++n) + (++n);
                var _vkSecret = crypto.createHash('md5').update(
                    Buffer.from(`${VK_TEST_CLIENT_ID}_${_vkId}_${VK_TEST_CLIENT_SECRET}`), 'binary'
                ).digest('hex');

                vkIds.push(_vkId);
                vkSecrets.push(_vkSecret);
            });
        });
        it('Should generate fbIds and stuff', () => {
            fbIds = [];
            fbUnicorns = [];
            _(N).times(n => fbIds.push('' + (++n) + (++n) + (++n)));
        });
        _(N).times(n => {
            it(`Should add vk account ${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    vkUnicorns.push(body.unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    vkid: vkIds[n],
                    vksecret: vkSecrets[n]
                }, null, null, callbackFn, OVERRIDE_PLATFORM_VK);
            });
            it(`Should add vk profile ${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    vkPlayersHumanIds.push(body.humanId);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, vkUnicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
            });
            it(`Should add fb account ${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    fbUnicorns.push(body.unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    fbtoken: fbIds[n]
                }, null, null, callbackFn, OVERRIDE_PLATFORM_FB);
            });
            it(`Should add fb profile ${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    fbPlayersHumanIds.push(body.humanId);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, fbUnicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
            });
        });
        _(N).times(n => {
            it(`Should post a record for vk player ${n + 1} in segment A`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    recordsCacheSegmentA.push({ hid: vkPlayersHumanIds[n], score: n + 1, vk: vkIds[n] });

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: n + 1,
                    segment: 'segma'
                }, null, vkUnicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
            });
            it(`Should post a record for vk player ${n + 1} in segment B`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    recordsCacheSegmentB.push({ hid: vkPlayersHumanIds[n], score: N - n, vk: vkIds[n] });

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: N - n,
                    segment: 'segmb'
                }, null, vkUnicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
            });
            it(`Should post a record for fb player ${n + 1} in segment A`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    recordsCacheSegmentA.push({ hid: fbPlayersHumanIds[n], score: N + n + 1, fb: fbIds[n] });

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: N + n + 1,
                    segment: 'segma'
                }, null, fbUnicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
            });
            it(`Should post a record for fb player ${n + 1} in segment B`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    recordsCacheSegmentB.push({ hid: fbPlayersHumanIds[n], score: N * 2 - n, fb: fbIds[n] });

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: N * 2 - n,
                    segment: 'segmb'
                }, null, fbUnicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
            });
        });
        it('Should sort records caches', () => {
            _.stableSortBy(recordsCacheSegmentA, e => e.score, false);
            _.stableSortBy(recordsCacheSegmentB, e => e.score, false);
        });
        _(Math.ceil(N * 2 / 20)).times(n => {
            it(`Should get page ${n + 1} of overall leaders from segment A`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({
                        records: recordsCacheSegmentA.slice(n * 20, n * 20 + 20),
                        len: N * 2
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersOverall', {
                    skip: n * 20,
                    limit: 20,
                    segment: 'segma'
                }, vkUnicorns[0], callbackFn, OVERRIDE_PLATFORM_VK);
            });
        });
        _(Math.ceil(N * 2 / 20)).times(n => {
            it(`Should get page ${n + 1} of overall leaders from segment B`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({
                        records: recordsCacheSegmentB.slice(n * 20, n * 20 + 20),
                        len: N * 2
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersOverall', {
                    skip: n * 20,
                    limit: 20,
                    segment: 'segmb'
                }, fbUnicorns[0], callbackFn, OVERRIDE_PLATFORM_FB);
            });
        });
    });
    describe('Getting leaders among friends', () => {
        const N = 21;

        describe('For VK player', () => {
            var vkSecrets, vkIds, unicorns;

            var humanIds = [],
                recordsCacheSegmentA = [],
                recordsCacheSegmentB = [];

            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });
            it('Should generate vk ids and calculate vk secrets and stuff', () => {
                vkIds = [];
                unicorns = [];
                vkSecrets = [];
                _(N).times(n => {
                    var _vkId = '' + (++n) + (++n) + (++n);
                    var _vkSecret = crypto.createHash('md5').update(
                        Buffer.from(`${VK_TEST_CLIENT_ID}_${_vkId}_${VK_TEST_CLIENT_SECRET}`), 'binary'
                    ).digest('hex');

                    vkIds.push(_vkId);
                    vkSecrets.push(_vkSecret);
                });
            });
            _(N).times(n => {
                it(`Should add account ${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        unicorns.push(body.unicorn);

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                        vkid: vkIds[n],
                        vksecret: vkSecrets[n]
                    }, null, null, callbackFn, OVERRIDE_PLATFORM_VK);
                });
                it(`Should add profile ${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        humanIds.push(body.humanId);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
                });
            });
            _(N).times(n => {
                it(`Should post a record for vk player ${n + 1} in segment A`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        recordsCacheSegmentA.push({ hid: humanIds[n], score: n + 1, vk: vkIds[n] });

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                        value: n + 1,
                        segment: 'segma'
                    }, null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
                });
                it(`Should post a record for vk player ${n + 1} in segment B`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        recordsCacheSegmentB.push({ hid: humanIds[n], score: N - n, vk: vkIds[n] });

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                        value: N - n,
                        segment: 'segmb'
                    }, null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_VK);
                });
            });
            it('Should sort records caches', () => {
                _.stableSortBy(recordsCacheSegmentA, e => e.score, false);
                _.stableSortBy(recordsCacheSegmentB, e => e.score, false);
            });
            it('Should try to get leaders without friends cache', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.be.equal('');

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                    skip: 0,
                    limit: 20,
                    segment: 'segma'
                }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_VK);
            });
            it('Should refresh VK friends', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshVkFriendsCache', null, {
                    friends: vkIds.slice(1).join(',')
                }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_VK);
            });
            _(Math.ceil(N / 20)).times(n => {
                it(`Should get page ${n + 1} of friends leaders from segment A`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        expect(body).to.deep.equal({
                            records: recordsCacheSegmentA.slice(n * 20, n * 20 + 20),
                            len: N
                        });

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                        skip: n * 20,
                        limit: 20,
                        segment: 'segma'
                    }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_VK);
                });
            });
            _(Math.ceil(N / 20)).times(n => {
                it(`Should get page ${n + 1} of friends leaders from segment B`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        expect(body).to.deep.equal({
                            records: recordsCacheSegmentB.slice(n * 20, n * 20 + 20),
                            len: N
                        });

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                        skip: n * 20,
                        limit: 20,
                        segment: 'segmb'
                    }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_VK);
                });
            });
        });
        describe('For FB player', () => {
            var fbIds, unicorns;

            var humanIds = [],
                recordsCacheSegmentA = [],
                recordsCacheSegmentB = [];

            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });
            it('Should generate fb ids and stuff', () => {
                fbIds = [];
                unicorns = [];
                _(N).times(n => fbIds.push('' + (++n) + (++n) + (++n)));
            });
            _(N).times(n => {
                it(`Should add account ${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        unicorns.push(body.unicorn);

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                        fbtoken: fbIds[n]
                    }, null, null, callbackFn, OVERRIDE_PLATFORM_FB);
                });
                it(`Should add profile ${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        humanIds.push(body.humanId);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
                });
            });
            _(N).times(n => {
                it(`Should post a record for fb player ${n + 1} in segment A`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        recordsCacheSegmentA.push({ hid: humanIds[n], score: n + 1, fb: fbIds[n] });

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                        value: n + 1,
                        segment: 'segma'
                    }, null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
                });
                it(`Should post a record for fb player ${n + 1} in segment B`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        recordsCacheSegmentB.push({ hid: humanIds[n], score: N - n, fb: fbIds[n] });

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                        value: N - n,
                        segment: 'segmb'
                    }, null, unicorns[n], callbackFn, OVERRIDE_PLATFORM_FB);
                });
            });
            it('Should sort records caches', () => {
                _.stableSortBy(recordsCacheSegmentA, e => e.score, false);
                _.stableSortBy(recordsCacheSegmentB, e => e.score, false);
            });
            it('Should try to get leaders without friends cache', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.be.equal('');

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                    skip: 0,
                    limit: 20,
                    segment: 'segma'
                }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_FB);
            });
            it('Should refresh fb friends', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.refreshFbFriendsCache', null, {
                    friends: fbIds.slice(1).join(',')
                }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_FB);
            });
            _(Math.ceil(N / 20)).times(n => {
                it(`Should get page ${n + 1} of friends leaders from segment A`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        expect(body).to.deep.equal({
                            records: recordsCacheSegmentA.slice(n * 20, n * 20 + 20),
                            len: N
                        });

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                        skip: n * 20,
                        limit: 20,
                        segment: 'segma'
                    }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_FB);
                });
            });
            _(Math.ceil(N / 20)).times(n => {
                it(`Should get page ${n + 1} of friends leaders from segment B`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.a('null');
                        expect(response.statusCode).to.be.equal(200);

                        expect(body).to.deep.equal({
                            records: recordsCacheSegmentB.slice(n * 20, n * 20 + 20),
                            len: N
                        });

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersWithinFriends', {
                        skip: n * 20,
                        limit: 20,
                        segment: 'segmb'
                    }, unicorns[0], callbackFn, OVERRIDE_PLATFORM_FB);
                });
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