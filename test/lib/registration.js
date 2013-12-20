"use strict";


// Test for the dynamic registration end point



var validAccessToken = "";
var validClientId = "";
var invalidClientId = "111";
var invalidAccessToken = "12345";

describe('POST /register', function() {

  var correctRegistrationRequest = {
    client_name: 'Test client',
    software_id: 'CPA AP Test',
    software_version: '0.0.1'
  };

  context("While sending the Content-Type: ", function() {
    it('should respond with 201 and a client_id', function(done) {
      request.post('/register').type("application/json").send(JSON.stringify(correctRegistrationRequest)).end(function(err, res) {
        if (err) {
          done(err);
        } else {
          expect(res.statusCode).to.equal(201);
          done();
        }
      });
    });
  });


  context("Without defining the content type", function() {
    it('returns a 400 Bad request error', function(done) {
      request.post('/register').send(JSON.stringify(correctRegistrationRequest)).end(function(err, res) {
        if (err) {
          done(err);
        } else {
          expect(res.statusCode).to.equal(400);
          done();
        }
      });
    });
  });


  context("When registering a client", function() {

    it('replies 201 with a complete Client Information Response', function(done) {
      request.post('/register').send(correctRegistrationRequest).end(function(err, res) {
        if (err) {
          done(err);
        } else {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('client_id');
          expect(res.body).to.have.property('registration_access_token');
          expect(res.body).to.have.property('registration_client_uri');
          validAccessToken = res.body.registration_access_token;
          validClientId = res.body.client_id;
          done();
        }

      });
    });
  });
});

describe('GET /register', function() {
  // Reference : http://tools.ietf.org/html/draft-ietf-oauth-dyn-reg-14#section-5.1

  context("When reading information about a client without access_token and with an invalid client_id", function() {
    it('should reply 401', function(done) {
      request.get('/register/' + invalidClientId).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(401);

          done();
        }
      });
    });
  });


  context("When reading information about a client with an invalid access_token and with an invalid client_id", function() {
    it('replies 401', function(done) {
      request.get('/register/' + invalidClientId).set('Authorization', 'Bearer ' + invalidAccessToken).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(401);

          done();
        }
      });
    });
  });


  context("When reading information about a client with a valid access_token and with an invalid client_id", function() {

    it('replies 401', function(done) {
      request.get('/register/' + invalidClientId).set('Authorization', 'Bearer ' + validAccessToken).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(401);

          done();
        }
      });
    });
  });


  context("When reading information about a client without access_token and with a valid client_id", function() {

    it('replies 401', function(done) {
      request.get('/register/' + validClientId).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(401);

          done();
        }

      });
    });
  });


  context("When reading information about a client with a invalid access_token and with a valid client_id", function() {

    it('replies 401', function(done) {
      request.get('/register/' + validClientId).set('Authorization', 'Bearer ' + invalidAccessToken).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(401);

          done();
        }

      });
    });
  });


  context("When reading information about a client with a valid access_token and with a valid client_id", function() {

    it('replies 200 and the Client Informations', function(done) {
      request.get('/register/' + validClientId).set('Authorization', 'Bearer ' + validAccessToken).end(function(err, res) {
        if (err) {
          done(err);
        } else {

          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('client_id');
          expect(res.body).to.have.property('registration_access_token');
          expect(res.body).to.have.property('registration_client_uri');

          done();
        }

      });
    });
  });

});
