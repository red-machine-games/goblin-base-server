'use strict';

var ErrorResponse = require('./ErrorResponse.js');

class ErrorResponseWithCode extends ErrorResponse{
    constructor(index, message, code){
        super(index, message);
        this.code = code;
    }
    getWithoutCode(){
        return new ErrorResponse(this.index, this.message, this.details);
    }
}

module.exports = ErrorResponseWithCode;