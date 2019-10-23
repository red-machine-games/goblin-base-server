'use strict';

const NOOP = () => {};

class LogsHook{
    constructor(opts){
        this.info = opts.info || NOOP;
        this.warn = opts.warn || NOOP;
        this.error = opts.error || NOOP;
        this.fatal = opts.fatal || NOOP;
    }
}

module.exports = LogsHook;