'use strict';

var crypto = require('crypto'),
    expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

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
    describe('Getting account', () => {
        var gClientSecret;

        it('Should create new account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body.gClientId.length).to.be.equal(32);

                gClientSecret = body.gClientSecret;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should try to login with wrong id', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(944, 'Got G client and secret but some of them seems incorrect'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: '134',
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should try to login with wrong secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(944, 'Got G client and secret but some of them seems incorrect'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: '1',
                gclientsecret: 'wrong_gClientSecret'
            }, null, null, callbackFn);
        });
    });
    describe('Create account, get with session, get with id:secret', () => {
        var gClientId, gClientSecret, unicorn;

        it('Should create account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');
                expect(body.gClientId.length).to.be.equal(32);

                unicorn = _unicorn;
                gClientId = body.gClientId;
                gClientSecret = body.gClientSecret;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should get account with session', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.unicorn).to.be.equal(unicorn);
                expect(body.gClientId).to.be.equal(gClientId);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, unicorn, callbackFn);
        });
        it('Should drop sessions operative subsystem', done => {
            let callbackFn = err => {
                expect(err).to.be.equal(null);
                done();
            };

            opClients.getSessionsClient().getRedis().flushdb(callbackFn);
        });
        it('Should get account with g-client ID and secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.unicorn).to.not.equal(unicorn);
                expect(body.gClientId).to.be.equal(gClientId);
                expect(body.gClientSecret).to.be.equal(gClientSecret);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
    });
    describe('Getting account with VK.com secret', () => {
        var vkId = '1337', secret;

        it('Should generate secret', () => {
            secret = crypto.createHash('md5').update(
                Buffer.from(`${VK_TEST_CLIENT_ID}_${vkId}_${VK_TEST_CLIENT_SECRET}`), 'binary'
            ).digest('hex');
        });
        it('Should create new account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('vk');
                expect(body.vk).to.be.equal(vkId);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                vkid: vkId,
                vksecret: secret
            }, null, null, callbackFn, require('../lib/webMiddleware/platformPlusVersionCheck.js').PLATFORM_WEB_VK);
        });
        it('Should get created account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('vk');
                expect(body.vk).to.be.equal(vkId);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                vkid: vkId,
                vksecret: secret
            }, null, null, callbackFn, require('../lib/webMiddleware/platformPlusVersionCheck.js').PLATFORM_WEB_VK);
        });
    });
    describe('Linking accounts and profiles', () => {
        describe('One person', () => {
            var unicorn, gClientId, gClientSecret, humanId,
                vkId = '12345';

            it('Should create account', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');
                    expect(body).to.not.have.property('gClientSecretSalt');
                    expect(body).to.not.have.property('profileId');

                    unicorn = _unicorn;
                    gClientId = body.gClientId;
                    gClientSecret = body.gClientSecret;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should try to link without main profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(35, 'You don\'t have a main profile to link one more'));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: vkId }, unicorn, callbackFn);
            });
            it('Should create profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('humanId');

                    humanId = body.humanId;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should link with profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ success: true, newProfile: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: vkId }, unicorn, callbackFn);
            });
            it('Should try to check account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(401);

                    expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, unicorn, callbackFn);
            });
            it('Should get account one more time', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');
                    expect(body).to.not.have.property('gClientSecretSalt');
                    expect(body.unicorn).to.not.be.equal(unicorn);

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientId, gclientsecret: gClientSecret
                }, null, null, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('humanId');
                    expect(body.humanId).to.not.be.equal(humanId);
                    expect(body.vk).to.be.equal(vkId);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
        });
        describe('Two person', () => {
            var unicorn1, unicorn2, humanId1, humanId2;

            var gClientId1, gClientSecret1,
                gClientId2, gClientSecret2;

            var vkId = '54321';

            it('Should create account 1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');
                    expect(body).to.not.have.property('gClientSecretSalt');
                    expect(body.profileId).to.be.equal(null || undefined);

                    gClientId1 = body.gClientId;
                    gClientSecret1 = body.gClientSecret;

                    unicorn1 = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create profile 1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('humanId');

                    humanId1 = body.humanId;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
            });
            it('Should link account 1 with uncreated profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ success: true, newProfile: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: vkId }, unicorn1, callbackFn);
            });
            it('Should try to check profile of account 1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(401);

                    expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn1, callbackFn);
            });
            it('Should get account 1 one more time', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');
                    expect(body).to.not.have.property('gClientSecretSalt');
                    expect(body.unicorn).to.not.equal(unicorn1);

                    unicorn1 = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientId1,
                    gclientsecret: gClientSecret1
                }, null, null, callbackFn);
            });
            it('Should check profile of account 1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.humanId).to.not.equal(humanId1);

                    humanId1 = body.humanId;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn1, callbackFn);
            });
            it('Should create account 2', done => {
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
            it('Should create profile 2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('humanId');

                    humanId2 = body.humanId;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
            });
            it('Should link account 2 with vk profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ success: true, newProfile: false });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: vkId }, unicorn2, callbackFn);
            });
            it('Should try to check profile of account 2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(401);

                    expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
            });
            it('Should get account 2 one more time', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId', gClientId2);
                    expect(body).to.have.property('gClientSecret', gClientSecret2);
                    expect(body).to.not.have.property('gClientSecretSalt');
                    expect(body.unicorn).to.not.equal(unicorn2);

                    unicorn2 = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientId2,
                    gclientsecret: gClientSecret2
                }, null, null, callbackFn);
            });
            it('Should check profile of account 2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.humanId).to.not.be.equal(humanId2);
                    expect(body.humanId).to.be.equal(humanId1);

                    humanId2 = body.humanId;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn2, callbackFn);
            });
        });
    });
    describe('Unlinking accounts and profiles', () => {
        var unicorn, gClientId, gClientSecret, nativeProfile,
            vkId = '56789';

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;
                gClientId = body.gClientId;
                gClientSecret = body.gClientSecret;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                nativeProfile = body.humanId;

                done();
            };
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should link with uncreated vk profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.success).to.be.equal(true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: vkId }, unicorn, callbackFn);
        });
        it('Should try to check vk profile of account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(401);

                expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should get account one more time', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId', gClientId);
                expect(body).to.have.property('gClientSecret', gClientSecret);
                expect(body).to.not.have.property('gClientSecretSalt');
                expect(body.unicorn).to.not.equal(unicorn);

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should check profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.humanId).to.not.be.equal(nativeProfile);
                expect(body.vk).to.be.equal(vkId);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should unlink vk profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorn, callbackFn);
        });
        it('Should try to check profile one more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(401);

                expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should get account again', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);
                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId', gClientId);
                expect(body).to.have.property('gClientSecret', gClientSecret);
                expect(body).to.not.have.property('gClientSecretSalt');
                expect(body.unicorn).to.not.equal(unicorn);

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should check profile of account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.humanId).to.be.equal(nativeProfile);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
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