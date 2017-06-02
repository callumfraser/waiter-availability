var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  username : {type: String, unique: true},
  password : {type: String},
  fullname : {type: String}
});

var User = mongoose.model('myUser', UserSchema);

module.exports = User;
