'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom, matchmaking,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../lib/features/realtimePvp/gameplayRoom.js');
        matchmaking = require('../lib/features/matchmaking/matchmaking.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    const _PLATFORM_VERSION = 'ios;0.0.2';

    var roomOccupation;

    it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            roomOccupation = +response;
            expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

            done();
        };

        opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
    });
    it('Should add room to matchmaking by hand', done => {
        let callbackFn = err => {
            expect(err).to.be.a('null');

            done();
        };

        var ipAddress = gameplayRoom._getIpAddress();
        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
    });

    var unicorn1, unicorn2;

    it('Should add account 1', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            unicorn1 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should add profile 1', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
    });
    it('Should add account 2', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            unicorn2 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should add profile 2', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
    });
    it('Should post record for first player', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
            value: 2,
            segment: 'segma'
        }, null, unicorn1, callbackFn);
    });
    it('Should post record for second player', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
            value: 3,
            segment: 'segma'
        }, null, unicorn2, callbackFn);
    });
    it('First player should search for opponent', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
    });

    var qplrKeyCached1, qplrKeyCached2;

    it('Should list all redis keys and cache qplr', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            var hasQplr = false;
            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    expect(hasQplr).to.be.equal(false);
                    hasQplr = true;
                    qplrKeyCached1 = response[i];
                }
            }
            expect(hasQplr).to.be.equal(true);

            done();
        };

        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('Should get qplrKeyCached from redis by hand and get value', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(1);

            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, callbackFn);
    });
    it(`Should wait ~6000 ms`, done => setTimeout(done, goblinBase.matchmakingConfig.numericConstants.timeForSearchMs));

    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 2 }, callbackFn);
    });
    it('Should get qplrKeyCached from redis by hand and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, callbackFn);
    });
    it('Should list \'sq:segma\' and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.not.be.a('null');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrange('sq:segma', 0, -1, 'withscores', callbackFn);
    });
    it('Second player should search for opponent', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, callbackFn);
    });
    it('Should list all redis keys and cache qplr', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            var hasQplr = false;
            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    expect(hasQplr).to.be.equal(false);
                    hasQplr = true;
                    qplrKeyCached2 = response[i];
                    expect(qplrKeyCached2).to.not.be.equal(qplrKeyCached1);
                }
            }
            expect(hasQplr).to.be.equal(true);

            done();
        };

        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('Should get qplrKeyCached from redis by hand and get value', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(1);

            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, callbackFn);
    });
    it(`Should wait ~6000 ms`, done => setTimeout(done, goblinBase.matchmakingConfig.numericConstants.timeForSearchMs));
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached from redis by hand and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, callbackFn);
    });
    it('Should list \'sq:segma\' and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.not.be.a('null');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrange('sq:segma', 0, -1, 'withscores', callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it(`Should wait ~6000 ms`, done => setTimeout(done, goblinBase.matchmakingConfig.numericConstants.timeForAcceptanceMs));
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0]).to.be.a('null');
            expect(responses[1]).to.be.a('null');

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().get(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().get(qplrKeyCached2, cb)
        ], callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });
    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });

    var grmbKeyCached1, grmbKeyCached2;

    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('Should list all redis keys and cache grmb\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('grmb:')){
                    if(!grmbKeyCached1){
                        grmbKeyCached1 = response[i];
                    } else if(!grmbKeyCached2){
                        grmbKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!grmbKeyCached1 && !!grmbKeyCached2).to.be.equal(true);

            done();
        };

        grmbKeyCached1 = null;
        grmbKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it(`Should wait ~6000 ms`, done => setTimeout(done, goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl));
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s and grmbKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);
            expect(responses[2]).to.be.equal(0);
            expect(responses[3]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(grmbKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(grmbKeyCached2, cb),
        ], callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });

    var gameroomHost, gameroomPort,
        bookingKey1, bookingKey2;

    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false,
            keyOne;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            gameroomHost = body.address.hosts.asDomain;
            gameroomPort = body.address.ports.ws;
            bookingKey1 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            bookingKey2 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('Should list all redis keys and cache grmb\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('grmb:')){
                    if(!grmbKeyCached1){
                        grmbKeyCached1 = response[i];
                    } else if(!grmbKeyCached2){
                        grmbKeyCached2 = response[i];
                    } else {
                        return done(new Error('WTF'));
                    }
                }
            }
            expect(!!grmbKeyCached1 && !!grmbKeyCached2).to.be.equal(true);

            done();
        };

        grmbKeyCached1 = null;
        grmbKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('First player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
    });

    var pairCached, pgotoCached = null, pinxCached1, pinxCached2, pidnxCached1, pidnxCached2;

    it('Should get all redis keys and cache \'pair:\' .. PAIR_ID, \'pgoto:\' .. PID_B, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('pair:')){
                    expect(pairCached).to.be.a('null');
                    pairCached = response[i];
                } else if(response[i].startsWith('pgoto:')){
                    expect(pgotoCached).to.be.a('null');
                    pgotoCached = response[i];
                } else if(response[i].startsWith('pinx:')){
                    expect(pinxCached1).to.be.a('null');
                    pinxCached1 = response[i];
                } else if(response[i].startsWith('pidnx:')){
                    expect(pidnxCached1).to.be.a('null');
                    pidnxCached1 = response[i];
                }
            }
            expect(!!pairCached && !!pgotoCached && !!pinxCached1 && !!pidnxCached1).to.be.equal(true);

            done();
        };

        pairCached = null;
        pgotoCached = null;
        pinxCached1 = null;
        pidnxCached1 = null;
        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('Should get the_occupation from redis', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal('0');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().get('the_occupation', callbackFn);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it(`Should wait ~7500 ms`, done => {
        setTimeout(() => {
            done();
        }, Math.max(
            goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl,
            goblinBase.pvpConfig.numericConstants.timeToConnectPairMs
        ) + 1500)
    });
    it('Should check free room in matchmaking', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.length).to.be.equal(2);
            expect(JSON.parse(response[0])).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(response[1]).to.be.equal('1');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrevrangebyscore('grooms', '+inf', '-inf', 'withscores', 'limit', 0, 1, callbackFn);
    });
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pgoto:\' .. PID_B, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');
            expect(responses[0]).to.be.equal('1');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(0);
            }

            pgotoCached = null;
            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pgotoCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb)
        ], callbackFn);
    });
    it('Should check free room in matchmaking', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.length).to.be.equal(2);
            expect(JSON.parse(response[0])).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(response[1]).to.be.equal('1');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrevrangebyscore('grooms', '+inf', '-inf', 'withscores', 'limit', 0, 1, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
        ], callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });
    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false,
            keyOne;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            gameroomHost = body.address.hosts.asDomain;
            gameroomPort = body.address.ports.ws;
            bookingKey1 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            bookingKey2 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('Should list all redis keys and cache grmb\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('grmb:')){
                    if(!grmbKeyCached1){
                        grmbKeyCached1 = response[i];
                    } else if(!grmbKeyCached2){
                        grmbKeyCached2 = response[i];
                    } else {
                        return done(new Error('WTF'));
                    }
                }
            }
            expect(!!grmbKeyCached1 && !!grmbKeyCached2).to.be.equal(true);

            done();
        };

        grmbKeyCached1 = null;
        grmbKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('First player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
    });
    it('Should get pgoto: from redis', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(pgotoCached).to.be.a('null');

            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('pgoto:')){
                    expect(pgotoCached).to.be.a('null');
                    pgotoCached = response[i];
                }
            }
            expect(pgotoCached).to.not.be.a('null');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('Second player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
    });
    it('Should check pgoto in redis and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            pgotoCached = null;
            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(pgotoCached, callbackFn)
    });
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get grmbKeyCached\'s from redis by hand and get 1', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0]).to.be.equal(1);
            expect(responses[1]).to.be.equal(1);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(grmbKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(grmbKeyCached2, cb)
        ], callbackFn);
    });
    it('Should get all redis keys and cache \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('pair:')){
                    expect(pairCached).to.be.a('null');
                    pairCached = response[i];
                } else if(response[i].startsWith('pinx:')){
                    if(pinxCached1){
                        expect(pinxCached2).to.be.a('null');
                        pinxCached2 = response[i];
                    } else {
                        pinxCached1 = response[i];
                    }
                } else if(response[i].startsWith('pidnx:')){
                    if(pidnxCached1){
                        expect(pidnxCached2).to.be.a('null');
                        pidnxCached2 = response[i];
                    } else {
                        pidnxCached1 = response[i];
                    }
                }
            }
            expect(!!pairCached && !!pinxCached1 && !!pinxCached2 && !!pidnxCached1 && !!pidnxCached2).to.be.equal(true);

            done();
        };

        pairCached = null;
        pinxCached1 = null;
        pinxCached2 = null;
        pidnxCached1 = null;
        pidnxCached2 = null;
        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it(`Should wait ~6000 ms`, done => setTimeout(done, goblinBase.pvpConfig.numericConstants.timeToConnectPairMs + 1000));
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal('1');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(0);
            }

            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached2, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached2, cb)
        ], callbackFn);
    });
    it(`Should wait more ~10000 ms`, done => setTimeout(done,
        goblinBase.matchmakingConfig.numericConstants.playerInGameroomTtl
            - goblinBase.pvpConfig.numericConstants.timeToConnectPairMs)
    );
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
        ], callbackFn);
    });
    it('Should check free room in matchmaking', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.length).to.be.equal(2);
            expect(JSON.parse(response[0])).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(response[1]).to.be.equal('1');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrevrangebyscore('grooms', '+inf', '-inf', 'withscores', 'limit', 0, 1, callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });
    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false,
            keyOne;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            gameroomHost = body.address.hosts.asDomain;
            gameroomPort = body.address.ports.ws;
            bookingKey1 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            bookingKey2 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('First player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
    });
    it('Should get pgoto: from redis', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(pgotoCached).to.be.a('null');

            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('pgoto:')){
                    expect(pgotoCached).to.be.a('null');
                    pgotoCached = response[i];
                }
            }
            expect(pgotoCached).to.not.be.a('null');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('Second player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
    });
    it('Should check pgoto in redis and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            pgotoCached = null;
            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(pgotoCached, callbackFn)
    });
    it('First player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: payload set' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
    });
    it('Second player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
    });
    it('First player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
    });
    it('Second player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('randomSeed');
            expect(body).to.have.property('startTs');
            expect(body).to.have.property('isA');
            delete body.randomSeed;
            delete body.startTs;
            delete body.isA;
            expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
    });
    it('Should get all redis keys and cache \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('pair:')){
                    expect(pairCached).to.be.a('null');
                    pairCached = response[i];
                } else if(response[i].startsWith('pinx:')){
                    if(pinxCached1){
                        expect(pinxCached2).to.be.a('null');
                        pinxCached2 = response[i];
                    } else {
                        pinxCached1 = response[i];
                    }
                } else if(response[i].startsWith('pidnx:')){
                    if(pidnxCached1){
                        expect(pidnxCached2).to.be.a('null');
                        pidnxCached2 = response[i];
                    } else {
                        pidnxCached1 = response[i];
                    }
                }
            }
            expect(!!pairCached && !!pinxCached1 && !!pinxCached2 && !!pidnxCached1 && !!pidnxCached2).to.be.equal(true);

            done();
        };

        pairCached = null;
        pinxCached1 = null;
        pinxCached2 = null;
        pidnxCached1 = null;
        pidnxCached2 = null;
        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it(`Should wait ~11005 ms`, done => setTimeout(done, goblinBase.pvpConfig.numericConstants.pairInGameTtlMs + 1005));
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal('1');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(0);
            }

            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached2, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached2, cb)
        ], callbackFn);
    });
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb)
        ], callbackFn);
    });
    it('Should check free room in matchmaking', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.length).to.be.equal(2);
            expect(JSON.parse(response[0])).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(response[1]).to.be.equal('1');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrevrangebyscore('grooms', '+inf', '-inf', 'withscores', 'limit', 0, 1, callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });
    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false,
            keyOne;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            gameroomHost = body.address.hosts.asDomain;
            gameroomPort = body.address.ports.ws;
            bookingKey1 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            bookingKey2 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('First player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
    });
    it('Should get pgoto: from redis', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(pgotoCached).to.be.a('null');

            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('pgoto:')){
                    expect(pgotoCached).to.be.a('null');
                    pgotoCached = response[i];
                }
            }
            expect(pgotoCached).to.not.be.a('null');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('Second player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
    });
    it('Should check pgoto in redis and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            pgotoCached = null;
            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(pgotoCached, callbackFn)
    });
    it('First player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: payload set' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
    });
    it('Second player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
    });
    it('First player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
    });
    it('Second player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('randomSeed');
            expect(body).to.have.property('startTs');
            expect(body).to.have.property('isA');
            delete body.randomSeed;
            delete body.startTs;
            delete body.isA;
            expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('Should get all redis keys and cache \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('pair:')){
                    expect(pairCached).to.be.a('null');
                    pairCached = response[i];
                } else if(response[i].startsWith('pinx:')){
                    if(pinxCached1){
                        expect(pinxCached2).to.be.a('null');
                        pinxCached2 = response[i];
                    } else {
                        pinxCached1 = response[i];
                    }
                } else if(response[i].startsWith('pidnx:')){
                    if(pidnxCached1){
                        expect(pidnxCached2).to.be.a('null');
                        pidnxCached2 = response[i];
                    } else {
                        pidnxCached1 = response[i];
                    }
                }
            }
            expect(!!pairCached && !!pinxCached1 && !!pinxCached2 && !!pidnxCached1 && !!pidnxCached2).to.be.equal(true);

            done();
        };

        pairCached = null;
        pinxCached1 = null;
        pinxCached2 = null;
        pidnxCached1 = null;
        pidnxCached2 = null;
        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });

    var wsConnection1, wsConnection2;

    it('First player should connect ws with gameroom', done => {
        let callbackFn = () => {
            if(openIsOk && messageIsOkay){
                expect(theMessage).to.have.property('state');
                expect(theMessage.state).to.have.property('model');
                expect(theMessage.state).to.have.property('randomSeed');
                expect(theMessage.state).to.have.property('startTs');
                expect(theMessage.state).to.have.property('opponentPayload');
                delete theMessage.state.opponentPayload;
                delete theMessage.state.randomSeed;
                delete theMessage.state.startTs;
                expect(theMessage).to.have.property('paused', 0);
                delete theMessage.paused;
                expect(theMessage).to.deep.equal({
                    "c": 4,
                    "state": {
                        "playerTurnA": 0,
                        "playerTurnB": 0,
                        "isA": 1,
                        "model": {
                            "plrA": {
                                "some": "payload"
                            },
                            "plrB": {
                                "some": "payload"
                            },
                            "plrAsq": 0,
                            "plrBsq": 0
                        }
                    }
                });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            }
        };

        wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
        var openIsOk = false, messageIsOkay = false, theMessage;

        wsConnection1.on('error', err => done(err));
        wsConnection1.on('open', () => {
            if(!openIsOk){
                openIsOk = true;
                callbackFn();
            } else {
                done(new Error('WTF 1'));
            }
        });
        wsConnection1.on('message', message => {
            if(!messageIsOkay){
                messageIsOkay = true;
                theMessage = JSON.parse(message);
                callbackFn();
            } else {
                done(new Error('WTF 2'));
            }
        });
        wsConnection1.on('close', () => done(new Error('WTF 3')));

    });
    it('Second player should connect ws with gameroom', done => {
        let callbackFn = () => {
            if(openIsOk && messageIsOkay){
                expect(theMessage).to.have.property('state');
                expect(theMessage.state).to.have.property('model');
                expect(theMessage.state).to.have.property('randomSeed');
                expect(theMessage.state).to.have.property('startTs');
                expect(theMessage.state).to.have.property('opponentPayload');
                delete theMessage.state.opponentPayload;
                delete theMessage.state.randomSeed;
                delete theMessage.state.startTs;
                expect(theMessage).to.have.property('paused', 0);
                delete theMessage.paused;
                expect(theMessage).to.deep.equal({
                    "c": 4,
                    "state": {
                        "playerTurnA": 0,
                        "playerTurnB": 0,
                        "isA": 0,
                        "model": {
                            "plrA": {
                                "some": "payload"
                            },
                            "plrB": {
                                "some": "payload"
                            },
                            "plrAsq": 0,
                            "plrBsq": 0
                        }
                    }
                });

                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            }
        };

        wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
        var openIsOk = false, messageIsOkay = false, theMessage;

        wsConnection2.on('error', err => done(err));
        wsConnection2.on('open', () => {
            if(!openIsOk){
                openIsOk = true;
                callbackFn();
            } else {
                done(new Error('WTF 1'));
            }
        });
        wsConnection2.on('message', message => {
            if(!messageIsOkay){
                messageIsOkay = true;
                theMessage = JSON.parse(message);
                callbackFn();
            } else {
                done(new Error('WTF 2'));
            }
        });
        wsConnection2.on('close', () => done(new Error('WTF 3')));
    });
    it(`Should wait ~5000 ms (ws connection should ping every sec)`, done => {
        var pingInterval = setInterval(() => {
            wsConnection1.send(JSON.stringify({ ping: 10 }));
            wsConnection2.send(JSON.stringify({ ping: 10 }));
        }, 1000);
        setTimeout(() => {
            clearInterval(pingInterval);
            done();
        }, goblinBase.pvpConfig.numericConstants.pairInGameTtlMs / 2);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get non-null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0]).to.be.equal(1);
            expect(responses[1]).to.be.equal(1);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
        ], callbackFn);

    });
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal('0');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(1);
            }

            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached2, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached2, cb)
        ], callbackFn);
    });

    var timeCached;

    it(`Both ws connections should close after ~2000 ms from last ping message`, done => {
        var now = _.now(), firstCloseIsOkay = false, secondCloseIsOkay = false;
        let generalCallbackFn = () => {
            if(firstCloseIsOkay && secondCloseIsOkay){
                let theNow = _.now();
                expect(theNow).to.be.above(now + goblinBase.pvpConfig.numericConstants.socketTtlMs - goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs);
                expect(theNow).to.be.below(now + goblinBase.pvpConfig.numericConstants.socketTtlMs + goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs);

                timeCached = theNow - now;

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            }
        };

        wsConnection1.on('error', err => done(err));
        wsConnection1.on('open', () => done(new Error('WTF 1')));
        wsConnection1.on('message', () => done(new Error('WTF 2')));
        wsConnection1.on('close', () => {
            if(!firstCloseIsOkay){
                firstCloseIsOkay = true;
                generalCallbackFn();
            } else {
                done(new Error('WTF 3'));
            }
        });
        wsConnection2.on('error', err => done(err));
        wsConnection2.on('open', () => done(new Error('WTF 4')));
        wsConnection2.on('message', () => done(new Error('WTF 5')));
        wsConnection2.on('close', () => {
            if(!secondCloseIsOkay){
                secondCloseIsOkay = true;
                generalCallbackFn();
            } else {
                done(new Error('WTF 6'));
            }
        });
    });
    it(`Should wait ~15000 ms`, done => setTimeout(done, goblinBase.matchmakingConfig.numericConstants.playerInGameroomTtl - timeCached + 10));
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 1 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
        ], callbackFn);
    });
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal('1');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(0);
            }

            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached2, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached2, cb)
        ], callbackFn);
    });

    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it('First player should accept match', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });
    it('Second player should accept match', done => {
        var firstIsOkay = false, secondIsOkay = false,
            keyOne;

        let callbackFn1 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            gameroomHost = body.address.hosts.asDomain;
            gameroomPort = body.address.ports.ws;
            bookingKey1 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

        let callbackFn2 = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(body).to.have.property('key');

            bookingKey2 = body.key;

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('First player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
    });
    it('Should get pgoto: from redis', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(pgotoCached).to.be.a('null');

            for(let i = 0 ; i < response.length ; i++){
                if(response[i].startsWith('pgoto:')){
                    expect(pgotoCached).to.be.a('null');
                    pgotoCached = response[i];
                }
            }
            expect(pgotoCached).to.not.be.a('null');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('Second player should release booking in gameroom', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
    });
    it('Should check pgoto in redis and get null', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response).to.be.equal(0);

            pgotoCached = null;
            done();
        };

        opClients.getMatchmakingClient().getRedis().exists(pgotoCached, callbackFn)
    });
    it('First player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 1, m: 'GR: payload set' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
    });
    it('Second player should set payload', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
    });
    it('First player should connect ws with gameroom', done => {
        let callbackFn = () => {
            if(openIsOk && messageIsOkay){
                expect(theMessage).to.deep.equal({ c: 2, m: 'GR: set ready' });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            }
        };

        wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
        var openIsOk = false, messageIsOkay = false, theMessage;

        wsConnection1.on('error', err => done(err));
        wsConnection1.on('open', () => {
            if(!openIsOk){
                openIsOk = true;
                callbackFn();
            } else {
                done(new Error('WTF 1'));
            }
        });
        wsConnection1.on('message', message => {
            if(!messageIsOkay){
                messageIsOkay = true;
                theMessage = JSON.parse(message);
                callbackFn();
            } else {
                done(new Error('WTF 2'));
            }
        });
        wsConnection1.on('close', () => done(new Error('WTF 3')));

    });
    it('Second player should connect ws with gameroom', done => {
        let callbackFn = () => {
            if(openIsOk && messageIsOkay){
                expect(theMessage).to.deep.equal({ c: 2, m: 'GR: set ready' });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            }
        };

        wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
        var openIsOk = false, messageIsOkay = false, theMessage;

        wsConnection2.on('error', err => done(err));
        wsConnection2.on('open', () => {
            if(!openIsOk){
                openIsOk = true;
                callbackFn();
            } else {
                done(new Error('WTF 1'));
            }
        });
        wsConnection2.on('message', message => {
            if(!messageIsOkay){
                messageIsOkay = true;
                theMessage = JSON.parse(message);
                callbackFn();
            } else {
                done(new Error('WTF 2'));
            }
        });
        wsConnection2.on('close', () => done(new Error('WTF 3')));
    });
    it('First player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
    });
    it('Second player should set ready', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('randomSeed');
            expect(body).to.have.property('startTs');
            expect(body).to.have.property('isA');
            delete body.randomSeed;
            delete body.startTs;
            delete body.isA;
            expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
    });
    it('Should list all redis keys and cache qplr\'s', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('qplr:')){
                    if(!qplrKeyCached1){
                        qplrKeyCached1 = response[i];
                    } else if(!qplrKeyCached2){
                        qplrKeyCached2 = response[i];
                    } else {
                        done(new Error('WTF'));
                    }
                }
            }
            expect(!!qplrKeyCached1 && !!qplrKeyCached2).to.be.equal(true);

            done();
        };

        qplrKeyCached1 = null;
        qplrKeyCached2 = null;
        opClients.getMatchmakingClient().getRedis().keys('*', callbackFn);
    });
    it('Should get all redis keys and cache \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            for(let i = 0; i < response.length ; i++){
                if(response[i].startsWith('pair:')){
                    expect(pairCached).to.be.a('null');
                    pairCached = response[i];
                } else if(response[i].startsWith('pinx:')){
                    if(pinxCached1){
                        expect(pinxCached2).to.be.a('null');
                        pinxCached2 = response[i];
                    } else {
                        pinxCached1 = response[i];
                    }
                } else if(response[i].startsWith('pidnx:')){
                    if(pidnxCached1){
                        expect(pidnxCached2).to.be.a('null');
                        pidnxCached2 = response[i];
                    } else {
                        pidnxCached1 = response[i];
                    }
                }
            }
            expect(!!pairCached && !!pinxCached1 && !!pinxCached2 && !!pidnxCached1 && !!pidnxCached2).to.be.equal(true);

            done();
        };

        pairCached = null;
        pinxCached1 = null;
        pinxCached2 = null;
        pidnxCached1 = null;
        pidnxCached2 = null;
        opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
    });
    it('First player should close ws connection and second player should get acknowledge', done => {
        wsConnection2.on('error', err => done(err));
        wsConnection2.on('open', () => done(new Error('WTF 1')));
        wsConnection2.on('message', msg => {
            msg = JSON.parse(msg);
            expect(msg).to.have.property('from');
            delete msg.from;
            expect(msg).to.deep.equal({ p: 4, c: 3, m: 'GR: opponent disconnected', paused: 1, turn: 0 });

            wsConnection2.removeAllListeners('error');
            wsConnection2.removeAllListeners('open');
            wsConnection2.removeAllListeners('message');
            wsConnection2.removeAllListeners('close');

            done();
        });
        wsConnection2.on('close', () => done(new Error('WTF 3')));
        wsConnection1.close();
    });
    it(`Second ws connection should be closed after ~8000 ms while second ws should send ping every 1000 ms`, done => {
        var now = _.now(),
            pingInterval = setInterval(doPing, 1000);

        function doPing(){
            wsConnection2.send(JSON.stringify({ ping: 10 }));
        }

        wsConnection2.on('error', err => done(err));
        wsConnection2.on('message', msg => {
            msg = JSON.parse(msg);
            if(_.isUndefined(msg.yrAvg) || _.isUndefined(msg.oppAvg) || _.keys(msg).length !== 2){
                clearInterval(pingInterval);
                done(new Error('WTF 1'))
            }
        });
        wsConnection2.on('close', () => {
            clearInterval(pingInterval);
            var theNow = _.now();
            expect(theNow - now).to.be.above(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + goblinBase.pvpConfig.numericConstants.pausedTimedoutPairInactivityMs - 5000);
            expect(theNow - now).to.be.below(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + goblinBase.pvpConfig.numericConstants.pausedTimedoutPairInactivityMs + 5000);

            wsConnection2.removeAllListeners('error');
            wsConnection2.removeAllListeners('message');
            wsConnection2.removeAllListeners('close');

            done();
        });
    });
    it(`Should wait ~7000 ms`, done => {
        setTimeout(() => {
            done();
        }, goblinBase.pvpConfig.numericConstants.pausedPairTtlMs)
    });
    it('Should wait 1 sec to gameroom refreshStats working out', done => {
        setTimeout(() => {
            done();
        }, 1005)
    });
    it('Should call "forceTryToRefreshStats"', done => {
        let callbackFn = code => {
            expect(code).to.be.equal(200);

            done();
        };

        matchmaking.forceTryToRefreshStats({ pid: 2 }, callbackFn);
    });
    it('Should get qplrKeyCached\'s from redis by hand and get null', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal(0);
            expect(responses[1]).to.be.equal(0);

            done();
        };

        async.parallel([
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached1, cb),
            cb => opClients.getMatchmakingClient().getRedis().exists(qplrKeyCached2, cb),
        ], callbackFn);
    });
    it('Should check free room in matchmaking', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.length).to.be.equal(2);
            expect(JSON.parse(response[0])).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
            expect(response[1]).to.be.equal('1');

            done();
        };

        opClients.getMatchmakingClient().getRedis().zrevrangebyscore('grooms', '+inf', '-inf', 'withscores', 'limit', 0, 1, callbackFn);
    });
    it('Should get and check the_occupation, \'pair:\' .. PAIR_ID, \'pinx:\' and \'pidnx:\'', done => {
        let callbackFn = (err ,responses) => {
            expect(err).to.be.a('null');

            expect(responses[0]).to.be.equal('1');

            for(let i = 1 ; i < responses.length ; i++){
                expect(responses[i]).to.be.equal(0);
            }

            done();
        };

        async.parallel([
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pairCached, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pinxCached2, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached1, cb),
            cb => opClients.getGameplayRoomClient().getRedis().exists(pidnxCached2, cb)
        ], callbackFn);
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