"use strict";

var db = require('../../models');
var config = require('../../config');
var jwtHelper = require('../../lib/jwt-helper');
var oAuthProviderHelper = require('../../lib/oAuth-provider-helper');
var request = require('request');
var jwt = require('jwt-simple');
var cors = require('../../lib/cors');

module.exports = function (app, options) {
    app.post('/api/facebook/signup', cors, function (req, res) {
        var facebookAccessToken = req.body.fbToken;
        if (facebookAccessToken && facebookAccessToken.length > 0) {
            // Get back user object from Facebook
            verifyFacebookUserAccessToken(facebookAccessToken, function (err, fbProfile) {
                if (fbProfile) {
                    // If the user already exists and his account is not validated
                    // i.e.: there is a user in the database with the same id and this user email is not validated
                    db.User.find({
                        where: {
                            email: fbProfile.email
                        }
                    }).then(function (userInDb) {
                        if (userInDb && !userInDb.verified) {
                            res.status(400).json({error: req.__("LOGIN_INVALID_EMAIL_BECAUSE_NOT_VALIDATED_FB")});
                        } else {
                            performFacebookLogin(fbProfile, function (error, response) {
                                if (response) {
                                    res.status(200).json(response);
                                } else {
                                    res.status(500).json({error: error.message});
                                }
                            });
                        }
                    // }).catch(function (err) {
                    //     return done(err, null);
                    });

                } else {
                    res.status(500).json({error: err.message});
                }

            });
        }
        else {
            // 400 BAD REQUEST
            console.log('error', 'Bad login request from ' +
                req.connection.remoteAddress + '. Reason: facebook access token and application name are required.');
            res.status(400);
        }
    });
};

function verifyFacebookUserAccessToken(token, done) {
    var path = 'https://graph.facebook.com/me?fields=id,email,name&access_token=' + token;
    request(path, function (error, response, body) {
        var data = JSON.parse(body);
        if (!error && response && response.statusCode && response.statusCode === 200) {
            var fbProfile = {
                provider_uid: "fb:" + data.id,
                display_name: data.name,
                email: data.email
            };
            done(null, fbProfile);
        } else {
            done({code: response.statusCode, message: data.error.message}, null);
        }
    });
}

function buildResponse(user) {
    var token = jwtHelper.generate(user.id, 10 * 60 * 60);
    return {
        success: true,
        user: user,
        token: token
    };
}

function performFacebookLogin(fbProfile, done) {
    if (fbProfile) {
        db.OAuthProvider.findOne({where: {uid: fbProfile.provider_uid}}).then(function (fbProvider) {
            if (!fbProvider) {
                db.User.findOrCreate({
                    where: {
                        email: fbProfile.email
                    }, defaults: {
                        verified: true,
                        display_name: fbProfile.display_name
                    }
                }).spread(function (me) {
                    me.updateAttributes({display_name: fbProfile.display_name, verified: true}).then(function () {
                        me.logLogin().then(function (user) {
                            var provider = db.OAuthProvider.build({
                                where: {
                                    name: oAuthProviderHelper.FB,
                                    uid: fbProfile.provider_uid,
                                    user_id: user.id
                                }
                            });
                            provider.save().then(function () {
                                return done(null, buildResponse(user));
                            });
                        }, function (error) {
                            return done(error, null);
                        });
                    });
                }).catch(function (err) {
                    return done(err, null);
                });
            } else {
                db.User.findOne({where: {email: fbProfile.email}}).then(function (user) {
                    user.logLogin().then(function () {
                        return done(null, buildResponse(user));
                    }, function (error) {
                        return done(error, null);
                    });
                });
            }
        }, function (error) {
            return done(error, null);
        });
    }
}