'use strict';

module.exports = {
    register
};

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app){
    app.get('/*', doHandle);
    app.post('/*', doHandle);
    app.put('/*', doHandle);
    app.delete('/*', doHandle);
    app.options('/*', doHandle);
    app.head('/*', doHandle);
    app.connect('/*', doHandle);
    app.trace('/*', doHandle);
}

function doHandle(req, res){
    res.code(400)
        .header('Content-Type', 'application/json')
        .send(new ErrorResponse(1053, `It's not a server-side error - it's TOTALLY YOUR FAULT. I don't know url "${req.originalUrl}" of method "${req.method}"! RTFM and get back.`))
}