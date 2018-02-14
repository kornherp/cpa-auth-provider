"use strict";

var config = require('../config');
var recaptcha = require('express-recaptcha');
var RateLimit = require('express-rate-limit');
var createAccountLimiter = null;


/** check if a request contains a recaptcha information */
function isRecaptchaRequest(req) {
    return req.body.hasOwnProperty('g-recaptcha-response');
}

// Recaptcha init
if (config.limiter.type === 'recaptcha' || config.limiter.type === 'recaptcha-optional') {
    recaptcha.init(config.limiter.parameters.recaptcha.site_key, config.limiter.parameters.recaptcha.secret_key);
}

// rate limiter init
if (config.limiter.type === 'rate' || config.limiter.type === 'recaptcha-optional') {
    var rateOptions = {
        windowMs: 10 * 60 * 1000,
        delayAfter: 1,
        delayMs: 1000,
        max: 0,
        message: "TOO_MANY_ATTEMPTS", // denied request message
        // allow google recaptcha enhanced things to bypass rate limiting
        skip: function () {
            return false;
        }
    };
    if (config.limiter && config.limiter.parameters && config.limiter.parameters.rate) {
        if (config.limiter.parameters.rate.windowMs) {
            rateOptions.windowMs = config.limiter.parameters.rate.windowMs;
        }
        if (config.parameters.rate.delayAfter) {
            rateOptions.windowMs = config.limiter.parameters.rate.delayAfter;
        }
        if (config.parameters.rate.delayMs) {
            rateOptions.windowMs = config.limiter.parameters.rate.delayMs;
        }
    }
    if (config.limiter.type === 'recaptcha-optional') {
        rateOptions.skip = isRecaptchaRequest;
    }
    createAccountLimiter = new RateLimit(rateOptions);
}

module.exports = {
    verify: function (req, res, next) {
        if (config.limiter.type === 'recaptcha') {
            recaptcha.middleware.verify(req, res, next);
        } else if (config.limiter.type === 'recaptcha-optional') {
            if (req.body.hasOwnProperty('g-recaptcha-response')) {
                recaptcha.middleware.verify(req, res, function () {
                    // Reset limiter
                    createAccountLimiter.resetKey(req.ip);
                    next();
                });
            } else {
                createAccountLimiter.middleware.verify(req, res, next);
            }
        } else if (config.limiter.type === 'rate') {
            createAccountLimiter.middleware.verify(req, res, next);
        } else { // no limiter
            req.recaptcha = {};
            next();
        }
    }
};
