var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var EventSchema = new Schema({
  latestBlock: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model("Event", EventSchema);