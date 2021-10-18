const ProofService = require("../services/ProofService");
const apiResponse = require("../helpers/apiResponse");
const Reward = require("../models/RewardModel");

var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

exports.getReward = [
	async function (req, res) {
		try {
			let { address } = req.params;
			let rewards = await Reward.find({address}, {}, {sort: {"timestamp": -1}}).limit(3);
			return apiResponse.successResponseWithData(res, "Operation success", {rewards});
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.updateRewardFreeRoot = [
	async function (req, res) {
		try {
			let update = await ProofService.updateRewardFreeRoot();
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

exports.updateRewardPremiumRoot = [
	async function (req, res) {
		try {
			let update = await ProofService.updateRewardPremiumRoot();
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