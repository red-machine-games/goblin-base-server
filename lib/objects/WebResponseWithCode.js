'use strict';

class WebResponseWithCode{
    constructor(_code, _responseBody){
        this.code = _code;
        this.responseBody = _responseBody;
    }
}

module.exports = WebResponseWithCode;