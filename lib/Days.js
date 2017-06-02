var mongoose = require('mongoose');

var DaysSchema = new mongoose.Schema({
  day: String,
  names: {type:[String], index: true}
});

var Days = mongoose.model('Days', DaysSchema);

module.exports = Days;
