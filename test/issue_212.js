'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js'),
    records;

var Record = require('../lib/persistenceSubsystem/dao/record.js'),
    Profile = require('../lib/persistenceSubsystem/dao/profile.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    var operativeRecordLifetimeCached;

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            operativeRecordLifetimeCached = goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime;
            goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime = 500;
            records = require('../lib/features/leaderboards/leaderboards.js');
        });
    });

    var unicorns = [], pids = [];

    describe('Adding players', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 1, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
        });
        it('Should create new vk account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { vktoken: 1 }, null, null, callbackFn);
        });
        it('Should create new profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 2, mmr: 0, vk: '1', ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[1], callbackFn);
        });
        it('Should create new fb account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                if(!_.isObject(body)){
                    body = JSON.parse(body);
                }
                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { fbtoken: 1 }, null, null, callbackFn);
        });
        it('Should create new profile #3', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 3, mmr: 0, fb: '1', ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[2], callbackFn);
        });
        it('Should create new ok account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { oktoken: 1 }, null, null, callbackFn);
        });
        it('Should create new profile #4', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 4, mmr: 0, ok: '1', ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[3], callbackFn);
        });
        _(4).times(n => {
            it(`Should get pid #${n + 1}`, done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');

                    pids.push(doc._id.toString());

                    done();
                };

                Profile.findOne({ humanId: n + 1 }, { projection: { _id: 1 } }, callbackFn);
            });
        });
    });
    describe('Definitely the cases', () => {
        describe('Case #1', () => {
            it('Should post record in segment segm1 for player #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: 1,
                    segment: 'segm1'
                }, null, unicorns[0], callbackFn);
            });
            it('Should remove record of player #1 by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                Record.deleteMany({}, callbackFn);
            });
            it('Should check "rclti" key in redis', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response).to.not.be.a('null');
                    expect(response).to.not.be.a('undefined');

                    expect(response).to.be.equal('1');

                    done();
                };

                opClients.getRecordsClient().getRedis().get(`rclti:segm1:p${pids[0]}`, callbackFn);
            });
            it('Should wait "records.operativeRecordLifetime" ms and a little bit', done =>
                setTimeout(done, goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime + 500)
            );
            it('Should get down "block_lti_scan" by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opClients.getRecordsClient().getRedis().del('block_lti_scan', callbackFn);
            });
            it('Should do bg job - tryToRefreshRecords', done => {
                let callbackFn = (err, updated) => {
                    expect(err).to.be.a('null');
                    expect(updated).to.be.equal(true);

                    done();
                };

                records._resetLazyTimeouts();
                records.tryToRefreshRecords(_.now() + 1, callbackFn);
            });
            it('Should list records overall', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ records: [], len: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersOverall', {
                    segment: 'segm1'
                }, unicorns[0], callbackFn);
            });
            it('Should get rating from segment "segm1" for player #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorns[0], callbackFn);
            });
            it('Should check "rclti" key in redis', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response).to.be.a('null');

                    done();
                };

                opClients.getRecordsClient().getRedis().get(`rclti:segm1:p${pids[0]}`, callbackFn);
            });
        });
        describe('Case #2', () => {
            it('Should post record in segment segm1 for player #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: 1,
                    segment: 'segm1'
                }, null, unicorns[1], callbackFn);
            });
            it('Should post record in segment segm1 for player #3', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: 1,
                    segment: 'segm1'
                }, null, unicorns[2], callbackFn);
            });
            it('Should post record in segment segm1 for player #4', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: 1,
                    segment: 'segm1'
                }, null, unicorns[3], callbackFn);
            });
            it('Should remove records by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                Record.deleteMany({}, callbackFn);
            });
            it('Should check "rclti" keys in redis', done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses).to.not.be.a('null');
                    expect(responses).to.not.be.a('undefined');

                    expect(responses).to.deep.equal(['1', '1', '1']);

                    done();
                };

                async.series([
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:vk1', cb),
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:fb1', cb),
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:ok1', cb)
                ], callbackFn);
            });
            it('Should wait "records.operativeRecordLifetime" ms and a little bit', done =>
                setTimeout(done, goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime + 500)
            );
            it('Should get down "block_lti_scan*" by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opClients.getRecordsClient().getRedis().del(
                    'block_lti_scan', 'block_lti_scan_vk', 'block_lti_scan_fb', 'block_lti_scan_ok',
                    callbackFn
                );
            });
            it('Should do bg job - tryToRefreshRecords', done => {
                let callbackFn = (err, updated) => {
                    expect(err).to.be.a('null');
                    expect(updated).to.be.equal(true);

                    done();
                };

                records._resetLazyTimeouts();
                records.tryToRefreshRecords(_.now() + 1, callbackFn);
            });
            it('Should list records overall', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ records: [], len: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersOverall', {
                    segment: 'segm1'
                }, unicorns[0], callbackFn);
            });
            it('Should check "rclti" key in redis', done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');

                    expect(responses).to.deep.equal([null, null, null]);

                    done();
                };

                async.series([
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:vk1', cb),
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:fb1', cb),
                    cb => opClients.getRecordsClient().getRedis().get('rclti:segm1:ok1', cb)
                ], callbackFn);
            });
        });
        describe('Case #3', () => {
            const N = 11;

            _(N).times(n => {
                it(`Should post record in segment segm${n + 1} for player #1`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                        value: 1,
                        segment: `segm${n + 1}`
                    }, null, unicorns[0], callbackFn);
                });
            });
            it('Should remove records of player #1 by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                Record.deleteMany({}, callbackFn);
            });
            it('Should check "rclti" keys in redis', done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses).to.not.be.a('null');
                    expect(responses).to.not.be.a('undefined');

                    expect(responses.length).to.be.equal(N);
                    expect(responses.every(e => e === '1')).to.be.equal(true);

                    done();
                };

                var asyncJobs = [];
                _(N).times(n => asyncJobs.push(cb => opClients.getRecordsClient().getRedis().get(`rclti:segm${n + 1}:p${pids[0]}`, cb)));
                async.series(asyncJobs, callbackFn);
            });
            it('Should wait "records.operativeRecordLifetime" ms and a little bit', done =>
                setTimeout(done, goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime + 2000)
            );
            it('Should get down "block_lti_scan", "segm_scan_tab" and "segm_scan" by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opClients.getRecordsClient().getRedis().del('block_lti_scan', 'segm_scan_tab', 'segm_scan', callbackFn);
            });
            it('Should do bg job - tryToRefreshRecords', done => {
                let callbackFn = (err, updated) => {
                    expect(err).to.be.a('null');
                    expect(updated).to.be.equal(true);

                    done();
                };

                records.tryToRefreshRecords(_.now(), callbackFn);
            });
            _(N).times(n => {
                it(`Should list records overall in segment segm${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        expect(body).to.deep.equal({ records: [], len: 0 });

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getLeadersOverall', {
                        segment: `segm${n + 1}`
                    }, unicorns[0], callbackFn);
                });
            });
            _(N).times(n => {
                it(`Should get rating from segment "segm${n + 1}" for player #1`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(404);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                        segment: `segm${n + 1}`
                    }, unicorns[0], callbackFn);
                });
            });
            it('Should check "rclti" keys in redis', done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses).to.not.be.a('null');
                    expect(responses).to.not.be.a('undefined');

                    expect(responses.length).to.be.equal(N);
                    expect(responses.every(e => e === null)).to.be.equal(true);

                    done();
                };

                var asyncJobs = [];
                _(N).times(n => asyncJobs.push(cb => opClients.getRecordsClient().getRedis().get(`rclti:segm${n + 1}:p${pids[0]}`, cb)));
                async.series(asyncJobs, callbackFn);
            });
            it('Should check "block_lti_scan" key', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response).to.be.equal('1');

                    done();
                };

                opClients.getRecordsClient().getRedis().get('block_lti_scan', callbackFn);
            });
        });
    });

    describe('Stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime = operativeRecordLifetimeCached;
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