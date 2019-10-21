'use strict';

module.exports = {
    register
};

const goblinBase = require('../../index.js').getGoblinBase();

const FASTIFY_CONTENT_TYPE_ERROR = 'FST_ERR_CTP',
    SYNTAX_ERROR = 'SyntaxError';

function register(app){
    app.addHook('onError', (req, res, error, done) => {
        if((!error.code || !error.code.startsWith(FASTIFY_CONTENT_TYPE_ERROR)) && (!error.stack || !error.stack.startsWith(SYNTAX_ERROR))){
            goblinBase.logsHook.error(error, req.raw.originalUrl);
        }
        done();
    })
}