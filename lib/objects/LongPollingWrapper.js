'use strict';

var _ = require('lodash');

class LongPollingWrapper{
    constructor(_req, _res){
        this.req = _req;
        this.res = _res;

        this._linkedRegistry = undefined;

        this._responseCode = undefined;
        this._responseBody = undefined;

        this._theRequestTimeout = undefined;

        this._onCloseLambda = () => this._onClose();

        this.req.raw.client.once('close', this._onCloseLambda);

        this._somePayload = undefined;
    }
    close(withCode, withResponseBody){
        this._responseCode = withCode;
        this._responseBody = withResponseBody;

        this._callback(true);
    }
    setColdResponse(withCode, withResponseBody, afterMs){
        this._responseCode = withCode;
        this._responseBody = withResponseBody;

        this.req.raw.client.setTimeout(afterMs * 2);
        this._theRequestTimeout = setTimeout(() => {
            if(this._linkedRegistry){
                this._linkedRegistry._removeMe(this);
                this._linkedRegistry = undefined;
            }
            this._callback(true);
        }, afterMs);
    }
    payload(path, variable){
        if(!this._somePayload){
            this._somePayload = {};
        }
        if(_.isNil(variable)){
            return _.get(this._somePayload, path);
        } else {
            _.set(this._somePayload, path, variable);
        }
    }
    _onClose(){
        this._callback(false);
    }
    _callback(sendResponse){
        if(this._theRequestTimeout){
            clearTimeout(this._theRequestTimeout);
        }
        if(this._linkedRegistry){
            this._linkedRegistry._removeMe(this);
            this._linkedRegistry = undefined;
        }
        this.req.raw.client.removeListener('close', this._onCloseLambda);
        if(sendResponse && !this.res.sent){
            if(this._responseCode && !this._responseBody){
                this.res.status(this._responseCode).end();
            } else if(this._responseCode && this._responseBody){
                this.res.status(this._responseCode).send(this._responseBody);
            }
        }
    }
    _appendToRegistry(theRegistry){
        if(this._linkedRegistry){
            this._linkedRegistry._removeMe(this);
        }
        this._linkedRegistry = theRegistry;
    }
}

module.exports = LongPollingWrapper;