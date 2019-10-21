'use strict';

var expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    describe('Getting profile', () => {
        var unicorn, humanId;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                humanId = body.humanId;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.humanId).to.be.equal(humanId);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
    });
    describe('Setting profile', () => {
        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should set profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                profileData: { field: 'tutorial' }, publicProfileData: { name: 'Egor' }
            }, unicorn, callbackFn);
        });
        it('Should get and check profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                expect(body).to.have.property('profileData');
                expect(body.profileData.field).to.be.equal('tutorial');
                expect(body).to.have.property('publicProfileData');
                expect(body.publicProfileData.name).to.be.equal('Egor');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should try to set profile with bad fields', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                profileData: {
                    $bad: 'field',
                    ok: {
                        $bad: 'field',
                        regexp: new RegExp('ab+c', 'i'),
                        normal: 'field'
                    }
                },
                publicProfileData: {
                    $bad: 'field',
                    ok: {
                        $bad: 'field',
                        regexp: /[A-Fa-f0-9]/,
                        normal: 'field'
                    }
                }
            }, unicorn, callbackFn);
        });
        it('Should set profile without bad fields', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                profileData: {
                    ok: {
                        normal: 'field'
                    }
                },
                publicProfileData: {
                    ok: {
                        normal: 'field'
                    }
                }
            }, unicorn, callbackFn);
        });
        it('Should get and check profile again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');

                expect(body).to.have.property('profileData');
                expect(body.profileData).to.not.have.property('$bad');
                expect(body.profileData).to.have.property('ok');
                expect(body.profileData.ok).to.not.have.property('$bad');
                expect(body.profileData.ok).to.not.have.property('regexp');
                expect(body.profileData.ok).to.have.property('normal');
                expect(body.profileData.ok.normal).to.be.equal('field');

                expect(body).to.have.property('publicProfileData');
                expect(body.publicProfileData).to.not.have.property('$bad');
                expect(body.publicProfileData).to.have.property('ok');
                expect(body.publicProfileData.ok).to.not.have.property('$bad');
                expect(body.publicProfileData.ok).to.not.have.property('regexp');
                expect(body.publicProfileData.ok).to.have.property('normal');
                expect(body.publicProfileData.ok.normal).to.be.equal('field');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
    });
    describe('Updating profile', () => {
        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should set profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                profileData: { field: 'extra' }, publicProfileData: { name: 'Ivan' }
            }, unicorn, callbackFn);
        });
        it('Should update profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, {
                profileData: { field: 'tutorial' }, publicProfileData: { name: 'Egor', age: 23 }
            }, unicorn, callbackFn);
        });
        it('Should get and check profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);

                expect(body).to.have.property('humanId');
                expect(body).to.have.property('profileData');
                expect(body.profileData.field).to.be.equal('tutorial');
                expect(body).to.have.property('publicProfileData');
                expect(body.publicProfileData.name).to.be.equal('Egor');
                expect(body.publicProfileData.age).to.be.equal(23);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
    });
    describe('Updating profile with Jsonpath (kind of)', () => {
        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should set profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                profileData: {
                    field: 'tutorial',
                    passedQuests: ['tutorial', 'first fight']
                },
                publicProfileData: {
                    name: 'Egor',
                    age: 23
                }
            }, unicorn, callbackFn);
        });
        it('Should update profile with jp', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            let transactions = [
                { set: 'profileData.field', val: 'extra field'},
                { pul: 'profileData.passedQuests', val: 'tutorial' },
                { del: 'publicProfileData.age' },
                { set: 'publicProfileData.friends', val: ['Kate', 'Andrew'] }
            ];

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.modifyProfile', null, transactions, unicorn, callbackFn);
        });
        it('Should get and check profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                expect(body).to.have.property('profileData');
                expect(body).to.have.property('publicProfileData');

                expect(body.profileData).to.deep.equal({
                    field: 'extra field',
                    passedQuests: ['first fight']
                });
                expect(body.publicProfileData).to.deep.equal({
                    name: 'Egor',
                    friends: ['Kate', 'Andrew']
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should update profile with jp 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            let transactions = [
                { set: 'profileData.arrayField', val: [{ hello: 'alpha' }, { world: 'beta' }]},
            ];
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.modifyProfile', null, transactions, unicorn, callbackFn);
        });
        it('Should get and check profile 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);
                body = typeof body === 'object' ? body : JSON.parse(body);

                expect(body).to.have.property('humanId');
                expect(body).to.have.property('profileData');
                expect(body).to.have.property('publicProfileData');

                expect(body.profileData).to.deep.equal({
                    field: 'extra field',
                    passedQuests: ['first fight'],
                    arrayField: [{ hello: 'alpha' }, { world: 'beta' }]
                });
                expect(body.publicProfileData).to.deep.equal({
                    name: 'Egor',
                    friends: ['Kate', 'Andrew']
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should update profile with jp 3', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            let transactions = [
                { set: 'profileData.arrayField.0.hello', val: 'alpha1'},
                { set: 'profileData.arrayField.1.world', val: 'beta1'},
            ];
            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.modifyProfile', null, transactions, unicorn, callbackFn);
        });
        it('Should get and check profile 3', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                expect(body).to.have.property('profileData');
                expect(body).to.have.property('publicProfileData');

                expect(body.profileData).to.deep.equal({
                    field: 'extra field',
                    passedQuests: ['first fight'],
                    arrayField: [{ hello: 'alpha1' }, { world: 'beta1' }]
                });
                expect(body.publicProfileData).to.deep.equal({
                    name: 'Egor',
                    friends: ['Kate', 'Andrew']
                });

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