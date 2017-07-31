"use strict";

var generate = require('../../lib/generate');
var db = require('../../models');

var requestHelper = require('../request-helper');
var dbHelper = require('../db-helper');

var initDatabase = function (opts, done) {

    db.Permission
        .create({
                id: 1,
                label: "admin"
            }
        ).then(function () {
        db.User
            .create({
                id: 3,
                email: 'testuser',
                provider_uid: 'testuser',
                display_name: 'Test User',
                permission_id: 1
            })
            .then(function (user) {
                return user.setPassword('testpassword');
            })
            .catch(function () {
            })
            .then(function () {
                    done();
                },
                function (error) {
                    done(new Error(JSON.stringify(error)));
                });
    });


};

var resetDatabase = function (opts, done) {
    if (!done) {
        done = opts;
        opts = {state: 'pending', user_id: null};
    }

    dbHelper.clearDatabase(function (err) {
        if (err) {
            done(err);
        }
        else {
            initDatabase(opts, done);
        }
    });
};

describe('DELETE /user/', function () {
    context('When a user delete his account', function () {
        context('and the user is authenticated', function () {

            var self = this;
            before(resetDatabase);

            before(function (done) {
                requestHelper.login(this, done);
            });


            before(function (done) {
                requestHelper.sendRequest(this, '/user', {
                    method: 'post',
                    type: 'form',
                    cookie: this.cookie,
                    data: {password: 'testpassword'}
                }, done);
            });

            before(function (done) {
                db.User.count().then(function (count) {
                    self.count = count;
                    done();
                });
            });

            it('should return a status 204 success no content', function () {
                expect(this.res.statusCode).to.equal(204);
                expect(self.count).to.equal(0);
            });

        });
        context('and tries to request secured resource', function () {

            var self = this;
            before(resetDatabase);

            before(function (done) {
                requestHelper.login(this, done);
            });


            before(function (done) {
                requestHelper.sendRequest(this, '/user', {
                    method: 'post',
                    type: 'form',
                    cookie: this.cookie,
                    data: {password: 'testpassword'}
                }, done);
            });

            before(function (done) {
                requestHelper.sendRequest(this, '/user/devices', {
                    cookie: this.cookie,
                    parseDOM: true,
                    data: {password: 'testpassword'}
                }, done);
            });

            it('should return a status 401', function () {
                expect(this.res.statusCode).to.equal(401);
            });


        });
        context('and the user is not authenticated', function () {
            before(resetDatabase);

            before(function (done) {
                requestHelper.sendRequest(this, '/user', {
                    method: 'post',
                    type: 'form',
                    data: {password: 'testpassword'}
                }, done);
            });

            it('should return a status 401', function () {
                expect(this.res.statusCode).to.equal(401);
            });

        });
        context('with bad password', function () {

            var self = this;
            before(resetDatabase);

            before(function (done) {
                requestHelper.login(this, done);
            });


            before(function (done) {
                requestHelper.sendRequest(this, '/user', {
                    method: 'post',
                    type: 'form',
                    cookie: this.cookie,
                    data: {password: 'wrongpassword'}
                }, done);
            });


            it('should return a status 401 unauthorized', function () {
                expect(this.res.statusCode).to.equal(401);
            });

        });

        context('with missing password', function () {

            var self = this;
            before(resetDatabase);

            before(function (done) {
                requestHelper.login(this, done);
            });


            before(function (done) {
                requestHelper.sendRequest(this, '/user', {
                    method: 'post',
                    type: 'form',
                    cookie: this.cookie,
                    data: {}
                }, done);
            });


            it('should return a status 401 unauthorized', function () {
                expect(this.res.statusCode).equal(401);
            });
        });

    });
});