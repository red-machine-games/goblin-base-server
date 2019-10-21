'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    async = require('async'),
    jsSha = require('jssha'),
    crypto = require('crypto'),
    ObjectID = require('mongodb').ObjectID;

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

var Account = require('../lib/persistenceSubsystem/dao/account.js'),
    Profile = require('../lib/persistenceSubsystem/dao/profile.js'),
    Record = require('../lib/persistenceSubsystem/dao/record.js'),
    Ticket = require('../lib/persistenceSubsystem/dao/ticket.js'),
    Battle = require('../lib/persistenceSubsystem/dao/battle.js'),
    AtomicAct = require('../lib/persistenceSubsystem/dao/atomicAct.js'),
    PveBattle = require('../lib/persistenceSubsystem/dao/pveBattle.js'),
    VkPurchase = require('../lib/persistenceSubsystem/dao/vkPurchase.js');

const T = 10000,
    N = 1000,
    L = 50,
    MAX_DELAY = 4;

after('Drop databases after contract', done => {
    async.parallel([
        cb => testUtils.removeAllDocuments(cb),
        cb => opClients.getSessionsClient().getRedis().flushall(cb),
    ], done);
});

var accountIds = [],
    profileIds = [],
    recordIds = [],
    ticketIds = [];

describe('Working with account and profile models', () => {
    describe('Stuff', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => opClients.getSessionsClient().getRedis().flushall(cb),
                cb => testUtils.removeAllDocuments(cb)
            ], done);
        });
    });
    describe('Add entries', () => {
        _(T / N).times(n => {
            it(`Should add ${N} accounts in database #${n + 1}`, done => {
                let callbackFn = (err, result) => {
                    expect(err).to.be.a('null');
                    expect(result.insertedCount).to.be.equal(N);

                    _.each(result.insertedIds, id => accountIds.push(id));

                    done();
                };

                var batch = [];
                _(N).times(n2 => {
                    var theShaForShake = new jsSha('SHAKE128', 'TEXT');

                    theShaForShake.update(n2 + (n * N) + 'lol');

                    batch.push({
                        gClientId: crypto.createHash('md5')
                            .update(Buffer.from(n2 + (n * N) + 'lol'), 'binary').digest('hex'),
                        gClientSecret: theShaForShake.getHash('HEX', { shakeLen: 256 }),
                        vk: `${n2 + (n * N)}vk`,
                        fb: `${n2 + (n * N)}fb`,
                        ok: `${n2 + (n * N)}ok`
                    })
                });
                Account.insertMany(batch, callbackFn);
            });
            it(`Should add ${N} profiles in database #${n + 1}`, done => {
                let callbackFn = (err, result) => {
                    expect(err).to.be.a('null');
                    expect(result.insertedCount).to.be.equal(N);

                    _.each(result.insertedIds, id => profileIds.push(id));

                    done();
                };

                var batch = [];
                _(N).times(n2 => {
                    var prof = {
                        humanId: n2 + (n * N),
                        vk: `${n2 + (n * N)}vk`,
                        fb: `${n2 + (n * N)}fb`,
                        ok: `${n2 + (n * N)}ok`,
                        battles: 0,
                        rating: 0,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { alpha: n2 + (n * N) },
                        publicProfileData: { beta: n2 + (n * N) },
                        ver: 1
                    };
                    if((n2 + (n * N)) % 2 === 1){
                        prof.clan = n2 + (n * N) + 'clan';
                        prof.unlinkedTtlIndex = ((n2 + (n * N)) % 4 === 0) ? 10 : 11;
                    }
                    batch.push(prof);
                });
                Profile.insertMany(batch, callbackFn);
            });
            it(`Should link ${N} accounts with profiles #${n + 1}`, done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                var asyncJobs = [];
                _(N).times(n2 => {
                    asyncJobs.push(
                        cb => Account.updateOne({ _id: accountIds[n2 + (n * N)] }, { $set: { pid: profileIds[n2 + (n * N)] } }, cb)
                    );
                });
                async.parallel(asyncJobs, callbackFn);
            });
            it(`Should add ${N} bots in database #${n + 1}`, done => {
                let callbackFn = (err, result) => {
                    expect(err).to.be.a('null');
                    expect(result.insertedCount).to.be.equal(N);

                    _.each(result.insertedIds, id => profileIds.push(id));

                    done();
                };

                var batch = [];
                _(N).times(n2 => {
                    var toPush = {
                        humanId: T + n2 + (n * N),
                        battles: 0,
                        rating: 0,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { alpha: n2 + (n * N) },
                        publicProfileData: { beta: n2 + (n * N) },
                        ver: 1,
                        isBot: true
                    };
                    if(n2 % 2 === 0){
                        toPush.isDeac = true;
                    }

                    batch.push(toPush);
                });
                Profile.insertMany(batch, callbackFn);
            });
        });
    });
    describe('Case №1', () => {
        it('Should find accounts by pid $or npid', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < results.length ; i++){
                    expect(results[i][1]).to.not.be.a('null');
                }
                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Account.find(
                        { $or: [{ pid: { $in: [profileIds[n]] } }, { npid: { $in: [profileIds[n]] } }] },
                        { projection: { pid: 1, npid: 1 } }
                    ).toArray((err, doc) => cb(err, [_.now() - ts1, doc]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №2', () => {
        it('Should find profiles with _id $in', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < results.length ; i++){
                    expect(results[i][1].length).to.be.equal(L);
                }
                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { _id: { $in: profileIds.slice(n, n + 50) } },
                        { projection: { humanId: 1, _id: 1 }, limit: L }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №3', () => {
        it('Should find profile with clan $exists=true', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < results.length ; i++){
                    expect(results[i][1]).to.not.be.a('null');
                }
                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { clan: { $exists: true } },
                        { projection: { _id: 1, clan: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    );
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №4', () => {
        it('Should find profiles with humanId $gte=n and clan $exists=true', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < results.length ; i++){
                    expect(results[i][1].length).to.be.below(L + 1);
                }
                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { humanId: { $gte: n, $lt: n + L }, clan: { $exists: true } },
                        { projection: { _id: 1, clan: 1 }, sort: { humanId: 1 } }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №5', () => {
        it('Should find profile with _id and clan $exists=false', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { _id: profileIds[n], clan: { $exists: false } },
                        { projection: { _id: 1 }, sort: { _id: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    )
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №6', () => {
        it('Should find profile with _id and clan $exists=true', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { _id: profileIds[n], clan: { $exists: true } },
                        { projection: { clan: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    )
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №7', () => {
        it('Should find profile with _id and clan', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { _id: profileIds[n], clan: `${n}clan` },
                        { projection: { clan: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    );
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №8', () => {
        it('Should find bot profile non-deactivated', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { humanId: n * 2, isBot: true, isDeac: { $exists: false } },
                        { projection: { _id: 1, profileData: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    )
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №9', () => {
        it('Should find profiles with humanId and unlinkedTtlIndex', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { humanId: { $gte: n }, unlinkedTtlIndex: { $exists: true, $lte: 10 } },
                        { projection: { _id: 1, humanId: 1 }, sort: { humanId: 1 }, limit: L }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №10', () => {
        it('Should find profile of non-deactivated bot', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.findOne(
                        { isBot: true, isDeac: { $exists: false } },
                        { projection: { _id: 1 } },
                        (err, doc) => cb(err, [_.now() - ts1, doc])
                    );
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №11', () => {
        it('Should find non-deactivated bots', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { humanId: { $gte: n * 2, $lt: n * 2 + L }, isBot: true, isDeac: { $exists: false } },
                        { projection: { humanId: 1, rating: 1 }, sort: { humanId: 1 } }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №12', () => {
        it('Should find non-bots', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { humanId: { $gte: n * 2, $lt: n * 2 + L }, isBot: { $exists: false } },
                        { projection: { humanId: 1, rating: 1 }, sort: { humanId: 1 } }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
    describe('Case №13', () => {
        it('Should find non-bots with profiles ratings', done => {
            let callbackFn = (err, results) => {
                expect(err).to.be.a('null');

                expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

                done();
            };

            var asyncJobs = [];
            _(T - L).times(n => asyncJobs.push(
                cb => {
                    var ts1 = _.now();
                    Profile.find(
                        { humanId: { $gte: n * 2, $lt: n * 2 + L }, isBot: { $exists: false }, ratings: { $exists: true } },
                        { projection: { humanId: 1, rating: 1 }, sort: { humanId: 1 } }
                    ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
                }
            ));
            async.series(asyncJobs, callbackFn);
        });
    });
});
describe('Working with records', () => {
    _(T / N).times(n => {
        it(`Should add ${N} records in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                _.each(result.insertedIds, id => recordIds.push(id));

                done();
            };

            var batch = [];
            _(N).times(n2 => batch.push({
                hid: n2 + (n * N),
                pid: profileIds[n2 + (n * N)],
                val: n2 + (n * N),
                segm: 'segma'
            }));
            Record.insertMany(batch, callbackFn);
        });
    });
    it('Should find record by pid and segment', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            for(let i = 0 ; i < results.length ; i++){
                expect(results[i][1]).to.not.be.a('null');
            }
            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Record.findOne(
                    { pid: profileIds[n], segm: 'segma' },
                    { projection: { val: 1 } },
                    (err, doc) => cb(err, [_.now() - ts1, doc])
                );
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});
describe('Working with tickets', () => {
    _(T / N).times(n => {
        it(`Should add ${N} tickets in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                _.each(result.insertedIds, id => ticketIds.push(id));

                done();
            };

            var batch = [];
            _(N).times(n2 => {
                var tic = {
                    tid: n2 + (n * N),
                    sender: profileIds[n2 + (n * N)],
                    receiver: profileIds[n2 + (n * N) + 1] || profileIds[0],
                    senderId: n2 + (n * N),
                    receiverId: n2 + (n * N) + 1,
                    receiverVk: n2 + (n * N) + 'vk',
                    receiverOk: n2 + (n * N) + 'ok',
                    receiverFb: n2 + (n * N) + 'fb',
                    ticketHead: 'ticket' + (n2 + (n * N))
                };
                if(n2 % 2 === 0){
                    tic.sat = (n2 % 4 === 0);
                }

                batch.push(tic);
            });
            Ticket.insertMany(batch, callbackFn);
        });
    });
    it('Should list tickets with sender pid and ttlIndex', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Ticket.find(
                    { sender: profileIds[n], ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) } },
                    { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list tickets with receiver pid $or receiverVk and ttlIndex', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Ticket.find(
                    {
                        $or: [{ receiver: profileIds[n] }, { receiverVk: n + 'vk' }],
                        ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
                    },
                    { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list tickets with receiver pid $or receiverOk and ttlIndex', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Ticket.find(
                    {
                        $or: [{ receiver: profileIds[n] }, { receiverFb: n + 'fb' }],
                        ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
                    },
                    { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list tickets with receiver pid $or receiverFb and ttlIndex', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Ticket.find(
                    {
                        $or: [{ receiver: profileIds[n] }, { receiverOk: n + 'ok' }],
                        ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
                    },
                    { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});
describe('Working with battles', () => {
    _(T / N).times(n => {
        it(`Should add ${N} battles in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                done();
            };

            var batch = [];
            _(N).times(n2 => batch.push({
                hid: n2 + (n * N) + 1,
                auto: false,
                pida: profileIds[n2 + (n * N)],
                pidb: profileIds[n2 + (n * N) + 1] || profileIds[0],
                dsp: { hello: 'world' + n2 },
                cat: _.random(100000)
            }));
            Battle.insertMany(batch, callbackFn);
        });
    });
    it('Should list battles with pida $or pidb', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                Battle.find(
                    { $or: [{ pida: profileIds[n] }, { pidb: profileIds[n] }] },
                    { projection: { _id: 0 }, sort: { cat: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});
describe('Working with pve battles', () => {
    _(T / N).times(n => {
        it(`Should add ${N} battles in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                done();
            };

            var batch = [];
            _(N).times(n2 => batch.push({
                hid: n2 + (n * N) + 1,
                pid: profileIds[n2 + (n * N)],
                dsp: { hello: 'world' + n2 },
                cat: _.random(100000)
            }));
            PveBattle.insertMany(batch, callbackFn);
        });
    });
    it('Should list pve battles with pid', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                PveBattle.find(
                    { pid: profileIds[n] },
                    { projection: { _id: 0 }, sort: { cat: -1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});
describe('Working with atomic acts', () => {
    var fictiveObjectIds = [], someCounter = 0;

    it('Should generate fictive object ids', () => {
        _(T).times(() => fictiveObjectIds.push(new ObjectID()));
    });
    _(T / N).times(n => {
        it(`Should add ${N} atomic acts in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                done();
            };

            var batch = [];
            _(N).times(n2 => batch.push({
                hid: ++someCounter,
                tp: 1,
                tch: [fictiveObjectIds[n2 + (n * N)]],
                dat: {},
                st: 0,
                cat: n2
            }));
            AtomicAct.insertMany(batch, callbackFn);
        });
    });
    it('Should get all atomic acts one by one', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        someCounter = 0;
        var asyncJobs = [];
        _(T - L).times(() => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                AtomicAct.findOne(
                    { tch: fictiveObjectIds[someCounter++] },
                    { projection: { _id: 0 } },
                    (err, doc) => cb(err, [_.now() - ts1, doc])
                );
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should get atomic acts with cat selector', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [],
            partOne = Math.floor((T - L) / 2),
            partTwo = Math.ceil((T - L) / 2);
        _(partOne).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                AtomicAct.findOne(
                    { cat: { $lte: n } },
                    { sort: { _id: 1 }, projection: { _id: -1 } },
                    (err, doc) => cb(err, [_.now() - ts1, doc])
                );
            }
        ));
        _(partTwo).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                AtomicAct.findOne(
                    { cat: { $lte: n } },
                    { sort: { _id: -1 }, projection: { _id: -1 } },
                    (err, doc) => cb(err, [_.now() - ts1, doc])
                );
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});
describe('Working with vk purchases', () => {
    _(T / N).times(n => {
        it(`Should add ${N} vk purchases in database #${n + 1}`, done => {
            let callbackFn = (err, result) => {
                expect(err).to.be.a('null');
                expect(result.insertedCount).to.be.equal(N);

                done();
            };

            var batch = [];
            _(N).times(n2 => batch.push({
                purchNum: n2 + (n * N) + 1, itemId: (n2 + (n * N) + 1) + '',
                pid: profileIds[n2 + (n * N)], orderId: n2 + (n * N) + 1,
                isConsumed: false,
                cat: _.random(100000)
            }));
            VkPurchase.insertMany(batch, callbackFn);
        });
    });
    it('Should list vk purchases with orderId', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                VkPurchase.find(
                    { orderId: n },
                    { projection: { _id: 0 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list vk purchases with pid', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                VkPurchase.find(
                    { pid: profileIds[n] },
                    { projection: { _id: 0 }, sort: { purchNum: 1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list vk purchases with pid again', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                VkPurchase.find(
                    { pid: profileIds[n] },
                    { projection: { _id: 0 }, sort: { purchNum: 1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
    it('Should list vk purchases with pid and purchNum', done => {
        let callbackFn = (err, results) => {
            expect(err).to.be.a('null');

            expect(results.map(e => e[0]).reduce((a, b) => a + b)).to.be.below(MAX_DELAY * results.length);

            done();
        };

        var asyncJobs = [];
        _(T - L).times(n => asyncJobs.push(
            cb => {
                var ts1 = _.now();
                VkPurchase.find(
                    { pid: profileIds[n], purchNum: { $gte: n } },
                    { projection: { _id: 0 }, sort: { purchNum: 1 }, skip: n, limit: L }
                ).toArray((err, docs) => cb(err, [_.now() - ts1, docs]));
            }
        ));
        async.series(asyncJobs, callbackFn);
    });
});