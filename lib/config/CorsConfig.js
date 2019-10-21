'use strict';

const DEFAULT_CORS_ORIGIN = '*',
    DEFAULT_CORS_ALLOW_HEADERS = 'X-Req-Seq,X-Request-Sign,X-Platform-Version,X-Unicorn,Accept,Content-Type,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,X-Benchmark-Intervals,X-Book-Key',
    DEFAULT_CORS_EXPOSE_HEADERS = 'X-Api-Version,X-Balance-Version,Accept,Content-Type,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,Pragma';

class CorsConfig{
    constructor(opts){
        this.origin = opts.origin || DEFAULT_CORS_ORIGIN;
        this.allowHeaders = opts.allowHeaders || DEFAULT_CORS_ALLOW_HEADERS;
        this.exposeHeaders = opts.exposeHeaders || DEFAULT_CORS_EXPOSE_HEADERS;
    }
}

module.exports = CorsConfig;