"use strict";

var db = require('../../models/index');
var config = require('../../config');
var requestHelper = require('../../lib/request-helper');
var oAuthProviderHelper = require('../../lib/oAuth-provider-helper');
var googleHelper = require('../../lib/google-helper');

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20');

var callbackHelper = require('../../lib/callback-helper');

passport.use(new GoogleStrategy({
        clientID: config.identity_providers.google.client_id,
        clientSecret: config.identity_providers.google.client_secret,
        callbackURL: callbackHelper.getURL('/auth/google/callback')
    },
    function (accessToken, refreshToken, profile, done) {
        var email = '';
        if (profile.emails !== undefined) {
            email = profile.emails[0].value;
        }

        if (email === '') {
            return done(new Error('NO_EMAIL', null));
        }

        var providerUid = googleHelper.buildGoogleId(profile.id);

        return oAuthProviderHelper.findOrCreateExternalUser(oAuthProviderHelper.GOOGLE, email, providerUid, profile.displayName, profile.name.givenName, profile.name.familyName, profile.gender, null).then(
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

    app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: config.urlPrefix + '/auth?error=LOGIN_INVALID_EMAIL_BECAUSE_NOT_VALIDATED_GOOGLE'}), function (req, res) {

        var redirectUri = req.session.auth_origin;
        delete req.session.auth_origin;

        req.session.save(
            function () {
                if (redirectUri) {
                    return res.redirect(redirectUri);
                }

                requestHelper.redirect(res, '/');
            }
        );
    });
};
