'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

var opResourceLocker;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    describe('Stuff', () => {
        it('Should do the stuff', () => {
            opResourceLocker = require('../lib/generalUtils/opResourceLocker.js');
        });
    });
    describe('Functionality', () => {
        describe('Case #1', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var theLock;

            it('Should get lock for resource 1', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock('1', callbackFn);
            });
            it('Should wait 7400 ms', done => setTimeout(done, 7400));
            it('Should return lock for resource 1', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opResourceLocker.returnLock(theLock, callbackFn);
            });
            it('Should get lock for resource 1 again', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock('1', callbackFn);
            });
            it('Should wait 7501 ms', done => setTimeout(done, 7501));
            it('Should try to return rotted lock', done => {
                let callbackFn = err => {
                    expect(err).to.not.be.a('null');

                    expect(err).to.deep.equal(new ErrorResponse(345, 'This lock has rotted'));

                    done();
                };

                opResourceLocker.returnLock(theLock, callbackFn);
            });
            it('Should get lock for resource 1 again 2', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock('1', callbackFn);
            });
            it('Should return lock for resource 1 again', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opResourceLocker.returnLock(theLock, callbackFn);
            });
        });
        describe('Case #2', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var theLock;

            it('Should get lock for resources か and さ', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock(['か', 'さ'], callbackFn);
            });

            var lockCallbackFn1, lockCallbackFn2;

            it('Should try to lock for resource か', done => {
                lockCallbackFn1 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock('か', (err, theLock) => lockCallbackFn1(err, theLock));
                setTimeout(done, 100);
            });
            it('Should try to lock for resource さ', done => {
                lockCallbackFn2 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock('さ', (err, theLock) => lockCallbackFn2(err, theLock));
                setTimeout(done, 100);
            });
            it('Should wait for 1700 ms', done => setTimeout(done, 1700));
            it('Should return lock for resources か and さ and they should be taken by another 2 requests', done => {
                var returnIsOkay, theLock1, theLock2;

                let generalCallbackFn = () => {
                    if(returnIsOkay && theLock1 && theLock2){
                        done();
                    }
                };

                lockCallbackFn1 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock1 = _theLock;
                    expect(theLock1).to.have.property('resources', 'か');

                    generalCallbackFn();
                };
                lockCallbackFn2 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock2 = _theLock;
                    expect(theLock2).to.have.property('resources', 'さ');

                    generalCallbackFn();
                };
                let returnLockCallback = err => {
                    expect(err).to.be.a('null');

                    returnIsOkay = true;
                    generalCallbackFn();
                };

                opResourceLocker.returnLock(theLock, returnLockCallback);
            });
        });
        describe('Case #3', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var theLock;

            it('Should get lock for resources 2 and 3', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock(['2', '3'], callbackFn);
            });

            var lockCallbackFn1, lockCallbackFn2;

            it('Should try to lock for resources 1 and 2', done => {
                lockCallbackFn1 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock(['1', '2'], (err, theLock) => lockCallbackFn1(err, theLock));
                setTimeout(done, 100);
            });
            it('Should try to lock for resource 3 and 4', done => {
                lockCallbackFn2 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock(['3', '4'], (err, theLock) => lockCallbackFn2(err, theLock));
                setTimeout(done, 100);
            });
            it('Should wait for 1700 ms', done => setTimeout(done, 1700));

            var theLock1, theLock2;

            it('Should return lock for resources 2 and 3 and 1, 2 and 3, 4 should be taken', done => {
                var returnIsOkay;

                let generalCallbackFn = () => {
                    if(returnIsOkay && theLock1 && theLock2){
                        done();
                    }
                };

                lockCallbackFn1 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock1 = _theLock;
                    expect(theLock1).to.have.property('resources');
                    expect(theLock1.resources).to.deep.equal(['1', '2']);

                    generalCallbackFn();
                };
                lockCallbackFn2 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock2 = _theLock;
                    expect(theLock2).to.have.property('resources');
                    expect(theLock2.resources).to.deep.equal(['3', '4']);

                    generalCallbackFn();
                };
                let returnLockCallback = err => {
                    expect(err).to.be.a('null');

                    returnIsOkay = true;
                    generalCallbackFn();
                };

                opResourceLocker.returnLock(theLock, returnLockCallback);
            });
            it('Should return lock for resources 1 and 2', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opResourceLocker.returnLock(theLock1, callbackFn);
            });
            it('Should return lock for resources 3 and 4', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opResourceLocker.returnLock(theLock2, callbackFn);
            });
        });
        describe('Case #4', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var theLock;

            it('Should get lock for resources 1 and 2', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock(['1', '2'], callbackFn);
            });

            var lockCallbackFn1, lockCallbackFn2;

            it('Should try to lock for resources 1 and 2', done => {
                lockCallbackFn1 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock(['1', '2'], (err, theLock) => lockCallbackFn1(err, theLock));
                setTimeout(done, 100);
            });
            it('Should try to lock for resource 2 and 3', done => {
                lockCallbackFn2 = () => {
                    done(new Error('WTF'));
                };

                opResourceLocker.getLock(['2', '3'], (err, theLock) => lockCallbackFn2(err, theLock));
                setTimeout(done, 100);
            });
            it('Should wait for 1700 ms', done => setTimeout(done, 1700));

            var lockIx;

            it('Should return lock for resources 1 and 2 and some next should get the next lock', done => {
                var returnIsOkay;

                let generalCallbackFn = () => {
                    if(returnIsOkay && theLock){
                        done();
                    }
                };

                lockCallbackFn1 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    if(theLock){
                        done(new Error('WTF 1'));
                    } else {
                        theLock = _theLock;
                        expect(theLock).to.have.property('resources');
                        expect(theLock.resources).to.deep.equal(['1', '2']);
                        lockIx = 1;

                        generalCallbackFn();
                    }
                };
                lockCallbackFn2 = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    if(theLock){
                        done(new Error('WTF 2'));
                    } else {
                        theLock = _theLock;
                        expect(theLock).to.have.property('resources');
                        expect(theLock.resources).to.deep.equal(['2', '3']);
                        lockIx = 2;

                        generalCallbackFn();
                    }
                };
                let returnLockCallback = err => {
                    expect(err).to.be.a('null');

                    returnIsOkay = true;
                    generalCallbackFn();
                };

                opResourceLocker.returnLock(theLock, returnLockCallback);
                theLock = null;
            });
            it('Should wait for 1700 ms', done => setTimeout(done, 1700));
            it('Should return the second lock and the third one should get the lock', done => {
                var returnIsOkay;

                let generalCallbackFn = () => {
                    if(returnIsOkay && theLock){
                        done();
                    }
                };

                if(lockIx === 1){
                    lockCallbackFn1 = () => done(new Error('WTF'));
                    lockCallbackFn2 = (err, _theLock) => {
                        expect(err).to.be.a('null');
                        expect(_theLock).to.not.be.a('null');

                        theLock = _theLock;
                        expect(theLock).to.have.property('resources');
                        expect(theLock.resources).to.deep.equal(['2', '3']);

                        generalCallbackFn();
                    };
                } else if(lockIx === 2){
                    lockCallbackFn1 = (err, _theLock) => {
                        expect(err).to.be.a('null');
                        expect(_theLock).to.not.be.a('null');

                        theLock = _theLock;
                        expect(theLock).to.have.property('resources');
                        expect(theLock.resources).to.deep.equal(['1', '2']);

                        generalCallbackFn();
                    };
                    lockCallbackFn2 = () => done(new Error('WTF'));
                }

                let returnLockCallback = err => {
                    expect(err).to.be.a('null');

                    returnIsOkay = true;
                    generalCallbackFn();
                };

                opResourceLocker.returnLock(theLock, returnLockCallback);
                theLock = null;
            });
            it('Should wait for 1700 ms', done => setTimeout(done, 1700));
            it('Should return the last lock', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                opResourceLocker.returnLock(theLock, callbackFn);
            });
        });
        describe('Case #5', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var theLock;

            it('Should get lock for resource 1', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock('1', callbackFn);
            });
            it('Should wait 7501 ms', done => setTimeout(done, 7501));
            it('Should try to return rotted lock', done => {
                let callbackFn = err => {
                    expect(err).to.not.be.a('null');

                    expect(err).to.deep.equal(new ErrorResponse(345, 'This lock has rotted'));

                    done();
                };

                opResourceLocker.returnLock(theLock, callbackFn);
            });
            it('Should get lock for resource 1', done => {
                let callbackFn = (err, _theLock) => {
                    expect(err).to.be.a('null');
                    expect(_theLock).to.not.be.a('null');

                    theLock = _theLock;

                    done();
                };

                opResourceLocker.getLock('1', callbackFn);
            });
        });
    });
    describe('Stress', () => {
        const N = 4, P = 10, M = N * 10, I = 250;

        var resources = [];

        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it(`Should init ${N} resources with ${P} parts`, () => {
            _(N).times(n => {
                let res = { lockedBy: null, parts: [], n };
                _(P).times(n2 => res.parts[n2] = { val: 0 });
                resources[n] = res;
            });
        });
        it(`${M} consumers should randomly consume ${N} concurrent resources in ${I} iterations without interruption`, done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');
                expect(resources.every(e => e.lockedBy === null)).to.be.equal(true);

                done();
            };

            function doStuffWithResource(consumerNum, iterationNum, callback){
                var resourcesToModify, theLock, resourcePartNum = 0;

                function pickResources(){
                    resourcesToModify = resources.length === 1
                        ? [resources[0].n]
                        : _.randE_Multiple(resources, _.random(1, resources.length - 1)).map(e => e.n);
                    acquireLock();
                }
                function acquireLock(){
                    let callbackFn = (err, _theLock) => {
                        if(err){
                            callback(err);
                        } else if(_theLock){
                            theLock = _theLock;
                            markTheResources();
                        } else {
                            callback(new Error('WTF 1'));
                        }
                    };

                    opResourceLocker.getLock(resourcesToModify.map(e => e + ''), callbackFn, consumerNum, iterationNum);
                }
                function markTheResources(){
                    for(let i = 0 ; i < resourcesToModify.length ; i++){
                        let res = resources[resourcesToModify[i]];
                        if(res.lockedBy !== null){
                            return callback(new Error('WTF 2'));
                        } else {
                            res.lockedBy = consumerNum;
                        }
                    }
                    modifyResourcePart();
                }
                function modifyResourcePart(){
                    for(let i = 0 ; i < resourcesToModify.length ; i++){
                        let res = resources[resourcesToModify[i]];
                        if(res.lockedBy !== consumerNum){
                            return callback(new Error('WTF 3'));
                        } else {
                            res.parts[resourcePartNum].val++;
                        }
                    }
                    if(++resourcePartNum === P){
                        unmarkTheResources();
                    } else {
                        process.nextTick(modifyResourcePart);
                    }
                }
                function unmarkTheResources(){
                    for(let i = 0 ; i < resourcesToModify.length ; i++){
                        resources[resourcesToModify[i]].lockedBy = null;
                    }
                    returnLock();
                }
                function returnLock(){
                    let callbackFn = err => {
                        if(err){
                            callback(new Error('WTF 4'));
                        } else if(++iterationNum === I){
                            callback(null);
                        } else {
                            doStuffWithResource(consumerNum, iterationNum, callback);
                        }
                    };

                    opResourceLocker.returnLock(theLock, callbackFn);
                }

                pickResources();
            }

            var asyncJobs = [];
            _(M).times(m => asyncJobs.push(cb => doStuffWithResource(m + 1, 0, cb)));
            async.parallel(asyncJobs, callbackFn);
        });
    });
});
describe('After stuff', () => {
    it('Should do clean', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});