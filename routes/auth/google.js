"use strict";

var db = require('../../models/index');
var config = require('../../config');
var requestHelper = require('../../lib/request-helper');

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20');

function findOrCreateExternalUser(email, defaults) {
    return new Promise(function (resolve, reject) {
        db.User.find(
            {
                where: {
                    email: email
                }
            }
        ).then(
            function (user) {
                if (!user) {
                    return db.User.findOrCreate(
                        {
                            where: {
                                email: email
                            },
                            defaults: defaults
                        }
                    ).spread(
                        function (user, created) {
                            return resolve(user);
                        }
                    ).catch(reject);
                }
                if (!user.verified) {
                    return resolve(false);
                }
                if (user.display_name) {
                    defaults.display_name = user.display_name;
                }
                return user.updateAttributes(
                    defaults
                ).then(resolve, reject);
            },
            reject
        );
    });
}

passport.use(new GoogleStrategy({
        clientID: config.identity_providers.google.client_id,
        clientSecret: config.identity_providers.google.client_secret,
        callbackURL: config.identity_providers.google.callback_url
    },
    function (accessToken, refreshToken, profile, done) {
        var email = '';
        if (profile.emails !== undefined) {
            email = profile.emails[0].value;
        }

        if (email === '') {
            return done(new Error('NO_EMAIL', null));
        }

        var providerUid = 'google:' + profile.id;

        return findOrCreateExternalUser(
            email,
            {
                provider_uid: providerUid,
                display_name: profile.displayName,
                verified: true
            }
        ).then(
            function (u) {
                if (u) {
                    u.logLogin();
                }
                return done(null, u);
            }
        ).catch(
            function (err) {
                done(err);
            }
        );
    }
));

module.exports = function (app, options) {
    app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));

    app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/auth?error=LOGIN_INVALID_EMAIL_BECAUSE_NOT_VALIDATED'}), function (req, res) {

        var redirectUri = req.session.auth_origin;
        delete req.session.auth_origin;

        if (redirectUri) {
            return res.redirect(redirectUri);
        }

        requestHelper.redirect(res, '/');
    });
};
