'use strict';

var _ = require('lodash');

var LongPollingWrapper = require('./LongPollingWrapper.js');

class LongPollingRegistry{
    constructor() {
        this.theRegistryData = {};
        this.theRegistryDataIndexes = new Map();
    }
    add(lpConnection, thePath){
        if(!(lpConnection instanceof LongPollingWrapper)){
            throw new Error('"lpConnection" is not the LongPollingWrapper. It must be to prevent errors');
        }
        if(thePath.split('.').length > 2){
            throw new Error('Currently 3-and-more-nodes depth path is not supported');
        }
        _.set(this.theRegistryData, thePath, lpConnection);
        this.theRegistryDataIndexes.set(lpConnection, thePath);
        lpConnection._appendToRegistry(this);
    }
    get(thePath){
        return _.get(this.theRegistryData, thePath);
    }
    del(thePath){
        var lpConnectionToDel = this.get(thePath);
        if(lpConnectionToDel && !(lpConnectionToDel instanceof LongPollingWrapper)){
            throw new Error('Deletion target is not the LongPollingWrapper. It must be to prevent errors');
        }

        this.theRegistryDataIndexes.delete(lpConnectionToDel);
        _.unset(this.theRegistryData, thePath);

        var pathSplitted = thePath.split('.');

        if(pathSplitted.length === 2){
            let _parentPath = pathSplitted.slice(0, pathSplitted.length - 1).join('.'),
                _parent = _.get(this.theRegistryData, _parentPath);
            if(_.isEmpty(_parent)){
                _.unset(this.theRegistryData, _parentPath);
            }
        }
    }
    _removeMe(lpConnection){
        this.del(this.theRegistryDataIndexes.get(lpConnection));
    }
}

module.exports = LongPollingRegistry;