var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,

  //Need to use bcrypt after encrypting
  comparePassword: function(attemptPassword, callback) {
    bcrypt.compare(attemptPassword, this.get('password'), function(err, res) {
      if (err) {
        console.log('err ', err);
        return;
      } else {
        callback(res);
      }
    });
  }
});

module.exports = User;