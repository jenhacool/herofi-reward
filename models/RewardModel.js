var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var RewardSchema = new Schema({
  address: {
    type: String,
    required: true
  },
  reward: {
    type: String,
    required: true
  },
  timestamp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true
  },
  claimed: {
    type: Boolean,
    required: true,
    default: false
  },
  history: {
    type: Object
  }
});

module.exports = mongoose.model("Reward", RewardSchema);