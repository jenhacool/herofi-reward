var express = require("express");
const RewardController = require("../controllers/RewardController");

var router = express.Router();

router.get("/:address", RewardController.getReward);

router.post("/get_proof", RewardController.getRewardProof);

router.post("/get_proofs", RewardController.getRewardProofs);

router.post("/root", RewardController.updateRewardRoot);

module.exports = router;