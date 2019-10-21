'use strict';

const DEFAULT_TICKET_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;

var validate = require('./utils/validateConfigs.js');

class TicketsConfig{
    constructor(opts){
        this.ticketLifetime = opts.ticketLifetime != null ? opts.ticketLifetime : DEFAULT_TICKET_LIFETIME_MS;

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.ticketLifetime, 'ticketLifetime', 1);
    }
}

module.exports = TicketsConfig;