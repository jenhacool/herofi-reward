const ProofService = require("../services/ProofService");
const apiResponse = require("../helpers/apiResponse");
const Reward = require("../models/RewardModel");
const Web3 = require("web3");

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

exports.getReward = [
	async function (req, res) {
		try {
			let { address } = req.params;
			address = web3.utils.toChecksumAddress(address);
			let currentTime = Math.floor(Date.now() / 1000);
			let newest = await Reward.findOne({}, {}, {sort: {"timestamp": -1}});
			let latestTimestamp = newest ? newest.timestamp : currentTime;
			let rewards = await Reward.find({timestamp: {$gte: currentTime - (86400 * 12)}, address}, {}, {sort: {"timestamp": -1}});
			let find = rewards.find(reward => reward.timestamp == latestTimestamp);

			if (find) {
				return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			}

			let latestReward = {
				"claimed": false,
				"timestamp": latestTimestamp,
				"address": address,
				"reward": "0",
				"type": rewards[0].type
			}

			rewards = [latestReward].concat(rewards);

			return apiResponse.successResponseWithData(res, "Operation success", {rewards});
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.updateRewardRoot = [
	async function (req, res) {
		try {
			let update = await ProofService.updateRewardRoot();
			if (update) {
				return apiResponse.successResponseWithData(res, "Operation success", []);
			}

			return apiResponse.ErrorResponse(res);
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.getRewardFreeProof = [
	async function (req, res) {
		try {
			let { address, timestamp } = req.body;

			if (!address || !timestamp) {
				return apiResponse.ErrorResponse(res, "Missing request data");
			}

			let proof = await ProofService.getRewardFreeProof(address, timestamp);

			if (proof.length) {
				return apiResponse.successResponseWithData(res, "Operation success", {proof});
			}

			return apiResponse.ErrorResponse(res, "Wrong data");
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.getRewardPremiumProof = [
	async function (req, res) {
		try {
			let { address, timestamp } = req.body;

			if (!address || !timestamp) {
				return apiResponse.ErrorResponse(res, "Missing request data");
			}

			let proof = await ProofService.getRewardPremiumProof(address, timestamp);

			if (proof.length) {
				return apiResponse.successResponseWithData(res, "Operation success", {proof});
			}

			return apiResponse.ErrorResponse(res, "Wrong data");
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];