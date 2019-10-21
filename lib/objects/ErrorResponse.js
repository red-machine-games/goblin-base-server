'use strict';

class ErrorResponse {
    constructor(index, message, details) {
        this.index = index;
        this.message = message;
        if(details){
            this.details = details;
        }
    }
    toString(){
        let out = `{"index":${this.index},"message":${typeof this.message === 'string' ? `"${this.message}"` : this.message}`;
        if(this.details){
            out += `,"details":${JSON.stringify(this.details)}}`;
        } else {
            out += '}'
        }
        return out;
    }
}

module.exports = ErrorResponse;