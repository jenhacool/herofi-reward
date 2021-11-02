var express = require("express");
const RewardController = require("../controllers/RewardController");

var router = express.Router();

router.get("/:address", RewardController.getReward);

router.post("/root", RewardController.updateRewardRoot);

router.post("/reward_free/proof", RewardController.getRewardFreeProof);

router.post("/reward_premium/proof", RewardController.getRewardPremiumProof);

module.exports = router;