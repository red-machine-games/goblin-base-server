'use strict';

module.exports = function(req, __, next){
    if(req.raw.method === 'POST'){
        req.body = req.body || {};
    }
    next();
};