'use strict';

var expect = require('chai').expect,
    async = require('async'),
    crypto = require('crypto'),
    request = require('request');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const VK_TEST_CLIENT_ID = require('./!testEntryPoint.js').VK_TEST_CLIENT_ID,
    VK_TEST_CLIENT_SECRET = require('./!testEntryPoint.js').VK_TEST_CLIENT_SECRET;

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    describe('Platform plus version check functionality', () => {
        var platformAndVersionCheck = require('../lib/webMiddleware/platformPlusVersionCheck.js').doCheck;

        it('Should check with right platform and fresh version', done => {
            var req = { headers: { 'X-Platform-Version': 'webvk;0.0.1' } },
                res = { status: () => { return { send: () => done(new Error('You should not be here!')) }} },
                next = () => {
                    expect(req.clientPlatform).to.be.equal('webvk');
                    expect(req.clientVersion).to.be.equal('0.0.1');
                    done();
                };

            platformAndVersionCheck(req, res, next);
        });
        it('Should check with right platform and newer version', done => {
            var req = { headers: { 'X-Platform-Version': 'webvk;0.0.2' } },
                res = { status: () => { return { send: () => done(new Error('You should not be here!')) }} },
                next = () => {
                    expect(req.clientPlatform).to.be.equal('webvk');
                    expect(req.clientVersion).to.be.equal('0.0.2');
                    done();
                };

            platformAndVersionCheck(req, res, next);
        });
        it('Should check with wrong platform', done => {
            var req = { headers: { 'X-Platform-Version': 'somestuff;0.0.1' } },
                res = { code: code => { return { send: error => {
                            expect(code).to.be.equal(400);
                            expect(error).to.deep.equal({index: 403, message: 'Invalid X-Platform-Version platform'});
                            done();
                        }}}},
                next = () => done(new Error('You should not be here!'));

            platformAndVersionCheck(req, res, next);
        });
        it('Should check with invalid header', done => {
            var req = { headers: { 'X-Platform-Version': 'pololo,trololo' } },
                res = { code: code => { return { send: error => {
                            expect(code).to.be.equal(400);
                            expect(error).to.deep.equal({ index: 405, message: 'Invalid X-Platform-Version header' });
                            done();
                        }}}},
                next = () => done(new Error('You should not be here!'));

            platformAndVersionCheck(req, res, next);
        });
        it('Should check without needed header', done => {
            var req = { headers: { } },
                res = { code: code => { return { send: error => {
                            expect(code).to.be.equal(400);
                            expect(error).to.deep.equal({ index: 406, message: 'No X-Platform-Version header!' });
                            done();
                        }}}},
                next = () => done(new Error('You should not be here!'));

            platformAndVersionCheck(req, res, next);
        });
    });
    describe('Request order validation and HMAC check', () => {
        const EXPRESS_HOST = '127.0.0.1', EXPRESS_PORT = 2222;

        var app = require('fastify')({ logger: false });

        it('Should start server with basic commands', done => {
            function getAccount(req, res) {
                let callbackFn = (code, response) => {
                    res.code(code).send(response);
                };



                require('../lib/features/accountsAndProfiles/accounts.js').getAccount(
                    req.sessionObject, req.query.gclientid, req.query.gclientsecret,
                    req.query.vkid, req.query.fbid, req.query.okid,
                    callbackFn
                );
            }
            function createProfile(req, res) {
                let callbackFn = (code, response) => {
                    res.code(code).send(response);
                };

                require('../lib/features/accountsAndProfiles/profiles.js').createProfile(
                    req.sessionObject, null, null, callbackFn
                );
            }
            function getProfile(req, res) {
                let callbackFn = (code, response) => {
                    res.code(code).send(response);
                };

                require('../lib/features/accountsAndProfiles/profiles.js')
                    .getProfile(req.sessionObject, 'ios', '0.0.2', callbackFn);
            }
            var sessionKeeper = require('../lib/webMiddleware/sessionKeeper'),
                platformPlusVersionCheck = require('../lib/webMiddleware/platformPlusVersionCheck.js').doCheck,
                requestOrderCheck = require('../lib/webMiddleware/requesOrderValidation.js').theCheck,
                hmacValidation = require('../lib/webMiddleware/hmacValidation.js').theCheck;

            app.route({
                method: 'POST',
                url: '/getAccount',
                preHandler: [
                    platformPlusVersionCheck,
                    requestOrderCheck, hmacValidation,
                    sessionKeeper.setSession
                ],
                handler: getAccount
            });
            app.route({
                method: 'GET',
                url: '/getAccount',
                preHandler: [
                    platformPlusVersionCheck,
                    sessionKeeper.getOrSetSession(),
                    requestOrderCheck, hmacValidation
                ],
                handler: getAccount
            });
            app.route({
                method: 'POST',
                url: '/createProfile',
                preHandler: [
                    platformPlusVersionCheck,
                    sessionKeeper.getSession(),
                    requestOrderCheck, hmacValidation
                ],
                handler: createProfile
            });
            app.route({
                method: 'GET',
                url: '/getProfile',
                preHandler: [
                    platformPlusVersionCheck,
                    sessionKeeper.getSession(),
                    requestOrderCheck, hmacValidation
                ],
                handler: getProfile
            });

            app.listen(EXPRESS_PORT, EXPRESS_HOST, done);
        });

        const PLATFORM_VERSION = 'webvk;0.0.1',
            VK_ID = '123';

        var vkSecret, unicorn;

        it('Should calculate social secret', () => {
            vkSecret = crypto.createHash('md5').update(
                Buffer.from(`${VK_TEST_CLIENT_ID}_${VK_ID}_${VK_TEST_CLIENT_SECRET}`), 'binary'
            ).digest('hex');
        });
        it('Should get session with wrong request sequence header but right hmac', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal(new ErrorResponse(408, `HMAC: sequence mismatch`));

                done();
            };

            request.post({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}` + 0 + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '1337'
                }
            }, callbackFn);
        });
        it('Should get session with right request sequence header but wrong hmac', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal(new ErrorResponse(392, `HMAC: invalid hmac`));

                done();
            };

            request.post({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}` + 1337 + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '0'
                }
            }, callbackFn);
        });
        it('Should get session with right request sequence header and hmac', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                body = JSON.parse(body);
                expect(body).to.have.property('unicorn');
                unicorn = body.unicorn;

                done();
            };

            request.post({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getAccount?vkid=${VK_ID}&vksecret=${vkSecret}` + 0 + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '0'
                }
            }, callbackFn);
        });
        it('Should create profile with right sequence and hmac', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            request.post({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/createProfile`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/createProfile` + 1 + unicorn + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '1',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should try to get profile with wrong request sequence and right hmac', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal(new ErrorResponse(408, `HMAC: sequence mismatch`));

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getProfile?hello=world` + 2 + unicorn + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '1337',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should try to get profile with right request sequence and wrong hmac', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal(new ErrorResponse(392, `HMAC: invalid hmac`));

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getProfile?hello=world` + 1337 + unicorn + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '3',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should get profile with right request sequence and right hmac', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getProfile?hello=world` + 4 + unicorn + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '4',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should make request without request order header', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal({ index: 876, message: 'HMAC: X-Req-Seq is totally wrong!' });

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getProfile?hello=world` + 5 + unicorn + 'default')
                        .digest('hex'),
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should make request without hmac sign header', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal({ index: 389, message: 'HMAC: no hmac or request sequence' });

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': PLATFORM_VERSION,
                    'X-Req-Seq': '6',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should try to use same session from different platform', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(401);

                body = JSON.parse(body);
                expect(body).to.deep.equal({ index: 423, message: 'Unknown unicorn' });

                done();
            };

            request.get({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getProfile?hello=world`,
                headers: {
                    'X-Platform-Version': 'ios;0.0.2',
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getProfile?hello=world` + 7 + unicorn + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '7',
                    'X-Unicorn': unicorn
                }
            }, callbackFn);
        });
        it('Should try to get new session with platform version that does not have hmac secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                body = JSON.parse(body);
                expect(body).to.deep.equal({ index: 393, message: 'HMAC: no appropriate string for your version' });

                done();
            };

            request.post({
                url: `http://${EXPRESS_HOST}:${EXPRESS_PORT}/getAccount`,
                headers: {
                    'X-Platform-Version': 'ios;0.0.1',
                    'X-Request-Sign': crypto
                        .createHash('sha256')
                        .update(`/getAccount` + 0 + 'default')
                        .digest('hex'),
                    'X-Req-Seq': '0'
                }
            }, callbackFn);
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