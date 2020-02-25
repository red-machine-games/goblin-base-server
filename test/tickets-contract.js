'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

var ticketLifeTime;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
    it('Should get some stuff', () => {
        ticketLifeTime = require('../index.js').getGoblinBase().ticketsConfig.ticketLifetime;
    });
});
describe('The cases', () => {
    describe('Sending ticket', () => {
        var unicorn1, unicorn2,
            senderId, receiverId;

        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: false,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
    });
    describe('Listing of sended/received tickets', () => {
        var unicorn1, unicorn2,
            senderId, receiverId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: false,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverId', receiverId);
                expect(body[0]).to.have.property('cb', false);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it(`Should try to list sended tickets after "ticketLifeTime" ms`, done => {
            setTimeout(() => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal([]);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                    skip: 0,
                    limit: 20
                }, unicorn1, callbackFn);
            }, ticketLifeTime);
        });
        it(`Should try to list received tickets after "ticketLifeTime" ms`, done => {
            setTimeout(() => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal([]);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listReceivedTickets', {
                    skip: 0,
                    limit: 20
                }, unicorn2, callbackFn);
            }, ticketLifeTime);
        });
    });
    describe('Sending VK tickets', () => {
        var unicorn1, senderId, receiverVk = '12345';

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
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should send VK ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverVk,
                    senderId,
                    payload: { vk: 'friend' }
                });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketVk', { receiverVk }, {
                ticketCallback: true,
                ticketPayload: { vk: 'friend' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverVk', receiverVk);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ vk: 'friend' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Sending OK tickets', () => {
        var unicorn1, senderId, receiverOk = '12345';

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
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should send OK ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverOk,
                    senderId,
                    payload: { ok: 'friend' }
                });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketOk', { receiverOk }, {
                ticketCallback: true,
                ticketPayload: { ok: 'friend' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverOk', receiverOk);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ ok: 'friend' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Sending FB ticket', () => {
        var unicorn1, unicorn2,
            senderId, receiverFb = '54321',
            gClientId2, gClientSecret2;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should send FB ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverFb,
                    senderId,
                    payload: { fb: 'friend' }
                });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketFb', { receiverFb }, {
                ticketCallback: true,
                ticketPayload: { fb: 'friend' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverFb', receiverFb);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ fb: 'friend' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: receiverFb }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get current profile of account 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.fb).to.be.equal(receiverFb);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('Should list received tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverFb', receiverFb);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ fb: 'friend' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listReceivedTickets', {
                skip: 0,
                limit: 20
            }, unicorn2, callbackFn);
        });
    });
    describe('Confirming ticket', () => {
        let unicorn1, unicorn2,
            senderId, receiverId,
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverId', receiverId);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body).to.not.have.property('isSatisfied');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat');
                expect(body[0].sat).to.be.equal(true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket to second player one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 2,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: false,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverId', receiverId);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now() / 1000);
                expect(body[0]).to.have.property('sat', true);

                expect(body[1]).to.have.property('tid', 2);
                expect(body[1]).to.have.property('senderId', senderId);
                expect(body[1]).to.have.property('receiverId', receiverId);
                expect(body[1]).to.have.property('cb', false);
                expect(body[1]).to.have.property('ticketHead', 'Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now() / 1000);
                expect(body[1]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should confirm ticket one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);

                _.stableSortBy(body, e => e.tid, true);
                expect(body[0]).to.have.property('tid', 1);
                expect(body[0]).to.have.property('senderId', senderId);
                expect(body[0]).to.have.property('receiverId', receiverId);
                expect(body[0]).to.have.property('cb', true);
                expect(body[0]).to.have.property('ticketHead', 'Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', true);

                expect(body[1]).to.have.property('tid', 2);
                expect(body[1]).to.have.property('senderId', senderId);
                expect(body[1]).to.have.property('receiverId', receiverId);
                expect(body[1]).to.have.property('cb', false);
                expect(body[1]).to.have.property('ticketHead', 'Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Ticket rejection', () => {
        var unicorn1, unicorn2,
            senderId, receiverId,
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after reject', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat');
                expect(body[0].sat).to.be.equal(false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Discharging ticket', () => {
        var unicorn1, unicorn2,
            senderId, receiverId,
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should discharge this ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket discharged');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.dischargeTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('Should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal([]);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 2,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('First player should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(2);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0].sat).to.be.equal(true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should try to discharge ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body.message).to.be.equal('Ticket not found');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.dischargeTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('First player should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(2);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0].sat).to.be.equal(true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Releasing ticket', () => {
        var unicorn1, unicorn2,
            senderId, receiverId,
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should try to release ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body.message).to.be.equal('Ticket not found');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.releaseTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('Should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket to second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 2,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('First player should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(2);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should release ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket released');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.releaseTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('First player should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 3,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('First player should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(3);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should try to release ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body.message).to.be.equal('Ticket not found');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.releaseTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('First player should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(3);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Dismissing ticket', () => {
        var unicorn1, unicorn2,
            senderId, receiverId,
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                receiverId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Should try to dismiss ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body.message).to.be.equal('Ticket not found');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.dismissTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('Should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 2,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('First player should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(2);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should try to dismiss ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body.message).to.be.equal('Ticket not found');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.dismissTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('First player should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(2);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should send ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 3,
                    ticketHead: 'Hello world',
                    receiverId,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicket', { receiverId }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicket', { ticketId }, unicorn2, callbackFn);
        });
        it('First player should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(3);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(2);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);
                expect(body[2].tid).to.be.equal(3);
                expect(body[2].receiverId).to.be.equal(receiverId);
                expect(body[2].senderId).to.be.equal(senderId);
                expect(body[2].cb).to.be.equal(true);
                expect(body[2].ticketHead).to.be.equal('Hello world');
                expect(body[2].payload).to.deep.equal({ hello: 'world' });
                expect(body[2]).to.have.property('cat');
                expect(body[2].cat).to.be.below(_.now());
                expect(body[2]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('First player should dismiss ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket dismissed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.dismissTicket', { ticketId }, unicorn1, callbackFn);
        });
        it('First player should list sended tickets again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(2);
                _.stableSortBy(body, e => e.tid, true);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverId).to.be.equal(receiverId);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');
                expect(body[1].tid).to.be.equal(2);
                expect(body[1].receiverId).to.be.equal(receiverId);
                expect(body[1].senderId).to.be.equal(senderId);
                expect(body[1].cb).to.be.equal(true);
                expect(body[1].ticketHead).to.be.equal('Hello world');
                expect(body[1].payload).to.deep.equal({ hello: 'world' });
                expect(body[1]).to.have.property('cat');
                expect(body[1].cat).to.be.below(_.now());
                expect(body[1]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Confirming ticket VK', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverVk = '123',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated vk profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: receiverVk }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send vk ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverVk,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketVk', { receiverVk }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].receiverVk).to.be.equal(receiverVk);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicketVk', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverVk).to.be.equal(receiverVk);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Confirming ticket OK', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverOk = '123',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated OK profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkOkProfile', { oktoken: receiverOk }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ok ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverOk,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };


            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketOk', { receiverOk }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].receiverOk).to.be.equal(receiverOk);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicketOk', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverOk).to.be.equal(receiverOk);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Confirming ticket FB', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverFb = '456',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated fb profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: receiverFb }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send fb ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverFb,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketFb', { receiverFb }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverFb).to.be.equal(receiverFb);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should confirm ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket confirmed');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.confirmTicketFb', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverFb).to.be.equal(receiverFb);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Rejecting ticket VK', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverVk = '123',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated vk profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: receiverVk }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send vk ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverVk,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketVk', { receiverVk }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].receiverVk).to.be.equal(receiverVk);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicketVk', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverVk).to.be.equal(receiverVk);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Rejecting ticket OK', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverOk = '123',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated OK profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkOkProfile', { oktoken: receiverOk }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send ok ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverOk,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };


            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketOk', { receiverOk }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].receiverOk).to.be.equal(receiverOk);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicketOk', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverOk).to.be.equal(receiverOk);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
    });
    describe('Rejecting ticket FB', () => {
        var unicorn1, unicorn2,
            gClientId2, gClientSecret2,
            senderId, receiverFb = '456',
            ticketId;

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should create new account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                senderId = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
        });
        it('Should create new account 2', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                gClientId2 = body.gClientId;
                gClientSecret2 = body.gClientSecret;
                unicorn2 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
        });
        it('Should link account 2 with uncreated fb profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: receiverFb }, unicorn2, callbackFn);
        });
        it('Should get account 2 one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn2 = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId2,
                gclientsecret: gClientSecret2
            }, null, null, callbackFn);
        });
        it('Should get profile for account 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
        });
        it('First player should send fb ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    tid: 1,
                    ticketHead: 'Hello world',
                    receiverFb,
                    senderId,
                    payload: { hello: 'world' }
                });

                ticketId = body.tid;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tickets.sendTicketFb', { receiverFb }, {
                ticketCallback: true,
                ticketPayload: { hello: 'world' },
                ticketHead: 'Hello world'
            }, unicorn1, callbackFn);
        });
        it('Should list sended tickets', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverFb).to.be.equal(receiverFb);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.not.have.property('sat');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
        });
        it('Second player should reject ticket', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.success).to.be.equal('Ticket rejected');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.rejectTicketFb', { ticketId }, unicorn2, callbackFn);
        });
        it('Should list sended tickets after confirm', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body.length).to.be.equal(1);
                expect(body[0].tid).to.be.equal(1);
                expect(body[0].receiverFb).to.be.equal(receiverFb);
                expect(body[0].senderId).to.be.equal(senderId);
                expect(body[0].cb).to.be.equal(true);
                expect(body[0].ticketHead).to.be.equal('Hello world');
                expect(body[0].payload).to.deep.equal({ hello: 'world' });
                expect(body[0]).to.have.property('cat');
                expect(body[0].cat).to.be.below(_.now());
                expect(body[0]).to.have.property('sat', false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tickets.listSendedTickets', {
                skip: 0,
                limit: 20
            }, unicorn1, callbackFn);
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