"use strict";

var db       = require('../../models');
var generate = require('../../lib/generate');

var assertions = require('../assertions');
var requestHelper = require('../request-helper');

// Tests for the End-point implementing the OAuth 2.0 Device Profile
// http://tools.ietf.org/html/draft-recordon-oauth-v2-device-00#page-3

var clearDatabase = function(done) {
  db.sequelize.query('DELETE FROM Clients').then(function() {
    done();
  },
  function(error) {
    done(error);
  });
};

var createClient = function(done) {
  db.Client
    .create({
      id:               3,
      secret:           'a0fe0231-0220-4d45-8431-1fd374998d78',
      name:             'Test client',
      software_id:      'CPA AP Test',
      software_version: '0.0.1',
      ip:               '127.0.0.1'
    })
    .then(function() {
      done();
    },
    function(err) {
      done(err);
    });
};

var createDomain = function(done) {
  db.Domain
    .create({
      id:           1,
      name:         'example-service.bbc.co.uk',
      access_token: '70fc2cbe54a749c38da34b6a02e8dfbd'
    })
    .complete(function(err, domain) {
      done();
    });
};

describe('POST /associate', function() {
  before(function() {
    sinon.stub(generate, "deviceCode").returns("8ecf4b2a-0df2-df7f-d69d-f128e0ac4fcc");
    sinon.stub(generate, "userCode").returns("DcTrYDLD");
  });

  after(function() {
    generate.deviceCode.restore();
    generate.userCode.restore();
  });

  before(clearDatabase);
  before(createClient);
  before(createDomain);

  context('with valid parameters', function() {
    before(function() {
      var time = new Date("Wed Apr 09 2014 11:00:00 GMT+0100").getTime();
      this.clock = sinon.useFakeTimers(time, "Date");
    });

    after(function() {
      this.clock.restore();
    });

    before(function(done) {
      var data = {
        client_id:        '3',
        client_secret:    'a0fe0231-0220-4d45-8431-1fd374998d78',
        domain:           'example-service.bbc.co.uk',
      };

      requestHelper.sendRequest(this, '/associate', {
        method: 'post',
        type:   'json',
        data:   data
      }, done);
    });

    it('should return a status 200', function() {
      expect(this.res.statusCode).to.equal(200);
    });

    // See example request in
    // http://tools.ietf.org/html/draft-recordon-oauth-v2-device-00#section-1.4

    it("should return a Cache-Control: no-store header", function() {
      expect(this.res.headers).to.have.property('cache-control');
      expect(this.res.headers['cache-control']).to.equal('no-store');
    });

    it("should return a Pragma: no-cache header", function() {
      expect(this.res.headers).to.have.property('pragma');
      expect(this.res.headers.pragma).to.equal('no-cache');
    });

    it('should return JSON', function() {
      expect(this.res.headers['content-type']).to.equal('application/json; charset=utf-8');
    });

    describe('the response body', function() {
      it('should be a JSON object', function() {
        expect(this.res.body).to.be.an('object');
      });

      it('should include the device code', function() {
        expect(this.res.body).to.have.property('device_code');
        expect(this.res.body.device_code).to.equal('8ecf4b2a-0df2-df7f-d69d-f128e0ac4fcc');
      });

      it('should include the user code', function() {
        expect(this.res.body).to.have.property('user_code');
        expect(this.res.body.user_code).to.equal('DcTrYDLD');
      });

      it('should include the verification uri', function() {
        expect(this.res.body).to.have.property('verification_uri');
        expect(this.res.body.verification_uri).to.equal('http://example.com/verify');
      });

      it('should include the expiry (time to live) of the user code', function() {
        expect(this.res.body).to.have.property('expires_in');
        expect(this.res.body.expires_in).to.equal(3600); // duration in seconds
      });

      it('should include the minimum polling interval', function() {
        expect(this.res.body).to.have.property('interval');
        expect(this.res.body.interval).to.equal(5); // interval in seconds
      });
    });

    context('with incorrect content type', function() {
      before(function(done) {
        var data = {
          client_id:     '3',
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78',
          domain:        'example-service.bbc.co.uk',
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'form', // should be 'json'
          data:   data
        }, done);
      });

      it("should return invalid_request error", function() {
        assertions.verifyError(this.res, 400, 'invalid_request');
      });
    });

    context('with missing client_id', function() {
      before(function(done) {
        var data = {
          client_id:     null,
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78',
          domain:        'example-service.bbc.co.uk',
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'json',
          data:   data
        }, done);
      });

      it("should return invalid_request error", function() {
        assertions.verifyError(this.res, 400, 'invalid_request');
      });
    });

    context('with an invalid client_id', function() {
      before(function(done) {
        var data = {
          client_id:     '-|13',
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78',
          domain:        'example-service.bbc.co.uk'
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'json',
          data:   data
        }, done);
      });

      it("should return invalid_client error", function() {
        assertions.verifyError(this.res, 400, 'invalid_client');
      });
    });

    context('with an unknown client_id', function() {
      before(function(done) {
        var data = {
          client_id:     '4',
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78',
          domain:        'example-service.bbc.co.uk'
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'json',
          data:   data
        }, done);
      });

      it("should return invalid_client error", function() {
        assertions.verifyError(this.res, 400, 'invalid_client');
      });
    });

    context('with missing domain', function() {
      before(function(done) {
        var data = {
          client_id:     '3',
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78'
          // domain:        'example-service.bbc.co.uk'
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'json',
          data:   data
        }, done);
      });

      it("should return an invalid_request error", function() {
        assertions.verifyError(this.res, 400, 'invalid_request');
      });
    });

    context('with an unknown domain', function() {
      before(function(done) {
        var data = {
          client_id:     '3',
          client_secret: 'a0fe0231-0220-4d45-8431-1fd374998d78',
          domain:        'unknown'
        };

        requestHelper.sendRequest(this, '/associate', {
          method: 'post',
          type:   'json',
          data:   data
        }, done);
      });

      it("should return an invalid_request error", function() {
        assertions.verifyError(this.res, 400, 'invalid_request');
      });
    });
  });
});
