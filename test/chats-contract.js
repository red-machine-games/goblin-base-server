'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    request = require('request-promise'),
    async = require('async'),
    faker = require('faker');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../lib/features/realtimePvp/gameplayRoom.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    describe('Unit test LongPollingWrapper and LongPollingRegistry', () => {
        var LongPollingWrapper = require('../lib/objects/LongPollingWrapper.js'),
            LongPollingRegistry = require('../lib/objects/LongPollingRegistry.js');

        var appForLPs, routeListenerLambda, lpAddress;

        var lpRegistry;

        it('Should wind up express app', done => {
            appForLPs = require('fastify')({ logger: false });

            appForLPs.get('/', async (req, res) => await routeListenerLambda(req, res));

            appForLPs.listen(30000 + Math.round(Math.random() * 20000), START_AT_HOST, (err, address) => {
                lpAddress = address;
                done(err);
            });
        });
        it('Should make a new registry', () => {
            lpRegistry = new LongPollingRegistry();
        });
        it('Should test out cold response', async () => {
            routeListenerLambda = async (req, res) => {
                var lp = new LongPollingWrapper(req, res);
                lpRegistry.add(lp, 'first');

                lp.setColdResponse(200, { everythings: 'okay' }, 1000);
            };

            var ts1 = _.now(),
                response = await request(`${lpAddress}/`),
                ts2 = _.now();

            if(!_.isObject(response)){
                response = JSON.parse(response);
            }

            expect(response).to.deep.equal({ everythings: 'okay' });
            expect(ts2 - ts1).to.be.at.least(999);
        });
        it('Should close lp without setting cold response', async () => {
            routeListenerLambda = async (req, res) => {
                var lp = new LongPollingWrapper(req, res);
                lpRegistry.add(lp, 'second');

                lp.close(200, { everythings: 'okay' });
            };

            var response = await request(`${lpAddress}/`);

            if(!_.isObject(response)){
                response = JSON.parse(response);
            }

            expect(response).to.deep.equal({ everythings: 'okay' });
        });
        it('Should close lp with setting cold response', async () => {
            routeListenerLambda = async (req, res) => {
                var lp = new LongPollingWrapper(req, res);
                lpRegistry.add(lp, 'third');

                lp.setColdResponse(400, { everythings: 'NOT okay' }, 1000);
                lp.close(200, { everythings: 'okay' });
            };

            var response = await request(`${lpAddress}/`);

            if(!_.isObject(response)){
                response = JSON.parse(response);
            }

            expect(response).to.deep.equal({ everythings: 'okay' });
        });
        it('Should test out retarded case(check out console)', async () => {
            routeListenerLambda = async (req, res) => {
                var lp = new LongPollingWrapper(req, res);
                lpRegistry.add(lp, 'fourth');

                res.status(200).send({ everythings: 'okay' });

                lp.close(200, { everythings: 'okay' });
            };

            var response = await request(`${lpAddress}/`);

            if(!_.isObject(response)){
                response = JSON.parse(response);
            }

            expect(response).to.deep.equal({ everythings: 'okay' });
        });
        it('Should check that registry\'s empty', () => {
            expect(lpRegistry.get('first')).to.be.an('undefined');
            expect(lpRegistry.get('second')).to.be.an('undefined');
            expect(lpRegistry.get('third')).to.be.an('undefined');
            expect(lpRegistry.get('fourth')).to.be.an('undefined');
        });
    });
    describe('Actual functionality', () => {
        const N = 5;

        var unicorns = [], gClientIds = [], gClientSecrets = [], humanIds = [];

        describe('It should prepare 2 players to communicate', () => {
            _(2).times(n => {
                it(`Should create new account #${n + 1}`, done => {
                    let callbackFn = (err, response, body, _unicorn) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        expect(body).to.have.property('unicorn');

                        expect(body).to.have.property('unicorn');
                        expect(body).to.have.property('gClientId');
                        expect(body).to.have.property('gClientSecret');

                        unicorns.push(_unicorn);
                        gClientIds.push(body.gClientId);
                        gClientSecrets.push(body.gClientSecret);

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
                });
                it(`Should create new profile #${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        if(!_.isObject(body)){
                            body = JSON.parse(body);
                        }

                        humanIds.push(body.humanId);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
                });
            });
        });
        describe('Elemental chat functions', () => {
            var firstPlayerSubscriptions = {}, secondPlayerSubscriptions = {};

            var cacheMessages = {};

            describe('Fetching and cold response', () => {
                it(`First player should get cold response from fetching group-1`, async () => {
                    var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'group-1' }, unicorns[0], undefined, undefined, true);

                    expect(response.statusCode).to.be.equal(200);
                    expect(response).to.have.property('body');

                    if(!_.isObject(response.body)){
                        response.body = JSON.parse(response.body);
                    }

                    expect(response.body).to.have.property('mess');
                    expect(response.body.mess).to.deep.equal([]);
                    expect(response.body).to.have.property('subscribed');
                    expect(response.body.subscribed).to.be.a('number');
                    expect(response.body.subscribed).to.be.above(0);
                });
                it(`First player should get cold response from fetching group-2`, async () => {
                    var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'group-2' }, unicorns[0], undefined, undefined, true);

                    expect(response.statusCode).to.be.equal(200);
                    expect(response).to.have.property('body');

                    if(!_.isObject(response.body)){
                        response.body = JSON.parse(response.body);
                    }

                    expect(response.body).to.have.property('mess');
                    expect(response.body.mess).to.deep.equal([]);
                    expect(response.body).to.have.property('subscribed');
                    expect(response.body.subscribed).to.be.a('number');
                    expect(response.body.subscribed).to.be.above(0);
                });
                it('Second player should make 2 fetches - the one should return cold response and other - concurrency error', async () => {
                    var firstResponseBody, secondResponseBody;

                    async function firstFetch(){
                        var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'group-1' }, unicorns[1], undefined, undefined, true);

                        try{
                            expect(response.statusCode).to.be.equal(200);
                        } catch(__){
                            expect(response.statusCode).to.be.equal(400);
                        }
                        expect(response).to.have.property('body');
                        if(!_.isObject(response.body)){
                            response.body = JSON.parse(response.body);
                        }
                        firstResponseBody = response.body;
                    }
                    async function secondFetch(){
                        var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'group-1' }, unicorns[1], undefined, undefined, true);

                        try{
                            expect(response.statusCode).to.be.equal(200);
                        } catch(__){
                            expect(response.statusCode).to.be.equal(400);
                        }
                        expect(response).to.have.property('body');
                        if(!_.isObject(response.body)){
                            response.body = JSON.parse(response.body);
                        }
                        secondResponseBody = response.body;
                    }

                    await Promise.all([firstFetch(), secondFetch()]);

                    try{
                        expect(firstResponseBody).to.have.property('subscribed', -1);
                        expect(firstResponseBody).to.have.property('mess');
                        expect(firstResponseBody.mess).to.deep.equal([]);
                        expect(secondResponseBody).to.deep.equal(new ErrorResponse(1125, 'Closed because of concurrent connection'));
                    } catch(__){
                        expect(secondResponseBody).to.have.property('subscribed', -1);
                        expect(secondResponseBody).to.have.property('mess');
                        expect(secondResponseBody.mess).to.deep.equal([]);
                        expect(firstResponseBody).to.deep.equal(new ErrorResponse(1125, 'Closed because of concurrent connection'));
                    }
                });
                it('Should wait ~15 secs to subscriptions end', done => setTimeout(done, goblinBase.chatsConfig.subscriptionLifetime));
            });
            describe('Posting and fetching', () => {
                _(N).times(n => {
                    it(`First player should post global message into "group-${n + 1}" and both should fetch it`, async () => {
                        var group = `group-${n + 1}`,
                            theMessage = faker.lorem.sentence().slice(0, 80);

                        async function firstPlayerLP(){
                            var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group }, unicorns[0], undefined, undefined, true);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body.mess.length).to.be.equal(1);
                            expect(response.body.mess[0]).to.have.property('m', theMessage);
                            expect(response.body.mess[0]).to.have.property('mseq', 1);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body).to.have.property('subscribed');
                            expect(response.body.subscribed).to.be.a('number');
                            expect(response.body.subscribed).to.be.above(0);

                            firstPlayerSubscriptions[group] = response.body.subscribed;
                        }
                        async function secondPlayerLP(){
                            var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group }, unicorns[1], undefined, undefined, true);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body.mess.length).to.be.equal(1);
                            expect(response.body.mess[0]).to.have.property('m', theMessage);
                            expect(response.body.mess[0]).to.have.property('mseq', 1);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body).to.have.property('subscribed');
                            expect(response.body.subscribed).to.be.a('number');
                            expect(response.body.subscribed).to.be.above(0);

                            secondPlayerSubscriptions[group] = response.body.subscribed;
                        }
                        async function firstPlayerToPostMessage(){
                            await _.wait(1000);

                            var response = await testUtils.thePost(START_AT_HOST, START_AT_PORT, 'chats.message', { group }, { message: theMessage }, unicorns[0]);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('broadcasted', true);

                            cacheMessages[group].push(theMessage);
                        }

                        cacheMessages[group] = [];

                        await Promise.all([firstPlayerLP(), secondPlayerLP(), firstPlayerToPostMessage()]);
                    });
                    it(`Second player should post global message into "group-${n + 1}" and both should fetch it`, async () => {
                        var group = `group-${n + 1}`,
                            theMessage = faker.lorem.sentence().slice(0, 80);

                        async function firstPlayerLP(){
                            var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group }, unicorns[0], undefined, undefined, true);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body.mess.length).to.be.equal(1);
                            expect(response.body.mess[0]).to.have.property('m', theMessage);
                            expect(response.body.mess[0]).to.have.property('mseq', 2);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body).to.have.property('subscribed', -1);
                        }
                        async function secondPlayerLP(){
                            var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group }, unicorns[1], undefined, undefined, true);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body.mess.length).to.be.equal(1);
                            expect(response.body.mess[0]).to.have.property('m', theMessage);
                            expect(response.body.mess[0]).to.have.property('mseq', 2);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body).to.not.have.property('subscribed', null);
                        }
                        async function secondPlayerToPostMessage(){
                            await _.wait(1000);

                            var response = await testUtils.thePost(START_AT_HOST, START_AT_PORT, 'chats.message', { group }, { message: theMessage }, unicorns[1]);

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('broadcasted', true);

                            cacheMessages[group].push(theMessage);
                        }

                        await Promise.all([firstPlayerLP(), secondPlayerLP(), secondPlayerToPostMessage()]);
                    });
                });
            });
            describe('Listing', () => {
                describe('Nothing', () => {
                    _(N).times(n => {
                        it(`First player should list messages from the subscription moment in "group-${n + 1}"`, async () => {
                            var group = `group-${n + 1}`;

                            var response = await testUtils.theGet(
                                START_AT_HOST, START_AT_PORT, 'chats.list',
                                { group, skip: 0, limit: 20, fromcat: firstPlayerSubscriptions[group] },
                                unicorns[0]
                            );

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.deep.equal({ mess: [], subscribed: -1 });
                        });
                        it(`Second player should list messages from the subscription moment in "group-${n + 1}"`, async () => {
                            var group = `group-${n + 1}`;

                            var response = await testUtils.theGet(
                                START_AT_HOST, START_AT_PORT, 'chats.list',
                                { group, skip: 0, limit: 20, fromcat: secondPlayerSubscriptions[group] },
                                unicorns[1]
                            );

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.deep.equal({ mess: [], subscribed: -1 });
                        });
                    });
                });
                describe('All', () => {
                    _(N).times(n => {
                        it(`First player should list messages from the now in "group-${n + 1}"`, async () => {
                            var group = `group-${n + 1}`;

                            var response = await testUtils.theGet(
                                START_AT_HOST, START_AT_PORT, 'chats.list',
                                { group, skip: 0, limit: 20, fromcat: _.now() },
                                unicorns[0]
                            );

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body).to.have.property('subscribed', -1);

                            expect(response.body.mess.length).to.be.equal(2);

                            expect(response.body.mess[0]).to.have.property('m', _.last(cacheMessages[group]));
                            expect(response.body.mess[0]).to.have.property('mseq', 2);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body.mess[1]).to.have.property('m', _.first(cacheMessages[group]));
                            expect(response.body.mess[1]).to.have.property('mseq', 1);
                            expect(response.body.mess[1]).to.have.property('cat');
                        });
                        it(`Second player should list messages from the now in "group-${n + 1}"`, async () => {
                            var group = `group-${n + 1}`;

                            var response = await testUtils.theGet(
                                START_AT_HOST, START_AT_PORT, 'chats.list',
                                { group, skip: 0, limit: 20, fromcat: _.now() },
                                unicorns[1]
                            );

                            expect(response.statusCode).to.be.equal(200);
                            expect(response).to.have.property('body');

                            if(!_.isObject(response.body)){
                                response.body = JSON.parse(response.body);
                            }

                            expect(response.body).to.have.property('mess');
                            expect(response.body).to.have.property('subscribed', -1);

                            expect(response.body.mess.length).to.be.equal(2);

                            expect(response.body.mess[0]).to.have.property('m', _.last(cacheMessages[group]));
                            expect(response.body.mess[0]).to.have.property('mseq', 2);
                            expect(response.body.mess[0]).to.have.property('cat');

                            expect(response.body.mess[1]).to.have.property('m', _.first(cacheMessages[group]));
                            expect(response.body.mess[1]).to.have.property('mseq', 1);
                            expect(response.body.mess[1]).to.have.property('cat');
                        });
                    });
                });
            });
            describe('Arguments validation', () => {
                it('First player should try to send large message', async () => {
                    var theMessage = [...Array(512)].map(() => (~~(Math.random() * 36)).toString(36)).join('');

                    var response = await testUtils.thePost(
                        START_AT_HOST, START_AT_PORT, 'chats.message', { group: 'some-group' },
                        { message: theMessage }, unicorns[0]
                    );

                    expect(response.statusCode).to.be.equal(400);
                    expect(response).to.have.property('body');

                    if(!_.isObject(response.body)){
                        response.body = JSON.parse(response.body);
                    }

                    expect(response.body).to.deep.equal(new ErrorResponse(1105, 'Message value has invalid size'));
                });
            });
        });
        describe('Aux case', () => {
            const N2 = 51;

            it('Should wait ~15 secs to subscriptions end', done => setTimeout(done, goblinBase.chatsConfig.subscriptionLifetime));
            it(`First player should get cold response`, async () => {
                var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'the-group' }, unicorns[0], undefined, undefined, true);

                expect(response.statusCode).to.be.equal(200);
                expect(response).to.have.property('body');

                if(!_.isObject(response.body)){
                    response.body = JSON.parse(response.body);
                }

                expect(response.body).to.have.property('mess');
                expect(response.body.mess).to.deep.equal([]);
                expect(response.body).to.have.property('subscribed');
                expect(response.body.subscribed).to.be.a('number');
                expect(response.body.subscribed).to.be.above(0);
            });
            it(`First player should post ${N2} messages to make his subscription gone`, async () => {
                for(let __ in [...Array(N2)]){
                    let theMessage = faker.lorem.sentence().slice(0, 80);

                    var response = await testUtils.thePost(START_AT_HOST, START_AT_PORT, 'chats.message', { group: 'the-group' }, { message: theMessage }, unicorns[0]);

                    expect(response.statusCode).to.be.equal(200);
                    expect(response).to.have.property('body');

                    if(!_.isObject(response.body)){
                        response.body = JSON.parse(response.body);
                    }

                    expect(response.body).to.have.property('broadcasted', true);
                }
            });
            it('First player should get cold response and it should show that player resubscribed', async () => {
                var response = await testUtils.theGet(START_AT_HOST, START_AT_PORT, 'chats.fetch', { group: 'the-group' }, unicorns[0], undefined, undefined, true);

                expect(response.statusCode).to.be.equal(200);
                expect(response).to.have.property('body');

                if(!_.isObject(response.body)){
                    response.body = JSON.parse(response.body);
                }

                expect(response.body).to.have.property('mess');
                expect(response.body.mess).to.deep.equal([]);
                expect(response.body).to.have.property('subscribed');
                expect(response.body.subscribed).to.be.a('number');
                expect(response.body.subscribed).to.be.above(0);
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