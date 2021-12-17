var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var RewardSchema = new Schema({
  address: {
    type: String,
    required: true,
    index: true
  },
  reward: {
    type: String,
    required: true
  },
  timestamp: {
    type: String,
    required: true,
    index: true
  },
  claimed: {
    type: Boolean,
    required: true,
    default: false
  },
  proof: {
    type: String
  },
  completedAt: {
    type: String
  },
  history: {
    type: Object
  }
});

module.exports = mongoose.model("Reward", RewardSchema);