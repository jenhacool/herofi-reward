const ProofService = require("../services/ProofService");
const apiResponse = require("../helpers/apiResponse");
const Reward = require("../models/RewardModel");
const Web3 = require("web3");
const fs = require("fs");
const path = require("path");

const blacklist = fs.readFileSync(path.resolve(process.cwd(), 'blacklist.txt')).toString().split('\n');

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

exports.getReward = [
	async function (req, res) {
		try {
			let { address } = req.params;
			// address = web3.utils.toChecksumAddress(address);
			// let whitelist = [
			// 	"0x8dDB2D1444dFD8f02facc19b15207563Cc7f6eD9",
			// 	"0x285F11E78923Cb02302E6Fbc92d14744eFe50018",
			// 	"0x1D0291245E954c11B481f713354D79B1747cAa0E",
			// 	"0x85D6173Eb26E33cC46722633b4b295E15441886c",
			// 	"0xA5ceB2cac429509f320EAC954Ef0a4C75f7E469C",
			// 	"0x8144060EfC730A0Cd86AC22B4Dc7b90B578f028E",
			// 	"0xbCc1F129785CaD2dc04D8e272d04E1BB257e5731"
			// ];
			// if (!whitelist.includes(address)) {
			// 	let rewards = [];
			// 	return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			// }
			// let currentTime = Math.floor(Date.now() / 1000);
			// let newest = await Reward.findOne({}, {}, {sort: {"timestamp": -1}});
			// let latestTimestamp = newest ? newest.timestamp : currentTime;
			// let rewards = await Reward.find({timestamp: {$gte: currentTime - (86400 * 12)}, address}, {}, {sort: {"timestamp": -1}});

			// if (rewards.length == 0) {
			// 	return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			// }

			// let find = rewards.find(reward => reward.timestamp == latestTimestamp);

			// if (find) {
			// 	return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			// }

			// let latestReward = {
			// 	"claimed": false,
			// 	"timestamp": latestTimestamp,
			// 	"address": address,
			// 	"reward": "0",
			// 	"type": rewards[0].type
			// };

			// rewards = [latestReward].concat(rewards);

			// let whitelist = [
			// 	"0x8dDB2D1444dFD8f02facc19b15207563Cc7f6eD9",
			// 	"0x1D0291245E954c11B481f713354D79B1747cAa0E",
			// 	"0x05ea9701d37ca0db25993248e1d8461A8b50f24a"
			// ];

			// if (!whitelist.includes(address)) {
			// 	let rewards = [];
			// 	return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			// }

			if (blacklist.includes(address.toLowerCase())) {
				let rewards = [];
				return apiResponse.successResponseWithData(res, "Operation success", {rewards});
			}

			let rewards = await Reward.find({address});

			rewards = rewards.map(reward => {
				return {
					"_id": reward._id,
					"claimed": reward.claimed,
					"address": reward.address,
					"reward": reward.reward,
					"timestamp": reward.timestamp,
					"completedAt": reward.completedAt,
					"proof": reward.proof ? JSON.parse(reward.proof) : reward.proof
				}
			});

			return apiResponse.successResponseWithData(res, "Operation success", {rewards});
		} catch (err) {
			console.log(err);
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

exports.getRewardProof = [
	async function (req, res) {
		try {
			let { address, timestamp } = req.body;

			if (!address || !timestamp) {
				return apiResponse.ErrorResponse(res, "Missing request data");
			}

			// if (["0x8dDB2D1444dFD8f02facc19b15207563Cc7f6eD9", "0x1D0291245E954c11B481f713354D79B1747cAa0E", "0x05ea9701d37ca0db25993248e1d8461A8b50f24a", "0xC9014432072Bf000d9F299D89C4F79650E957ac8", "0xCB2FDD392CBb20737D7A164b65177b671a433F01"].includes(address)) {
			// 	let proof = await ProofService.getRewardProof(address, timestamp);

			// 	if (proof) {
			// 		return apiResponse.successResponseWithData(res, "Operation success", proof);
			// 	}
	
			// 	return apiResponse.ErrorResponse(res, "Wrong data");
			// }

			// let proof = [];

			// return apiResponse.successResponseWithData(res, "Operation success", proof);

			if (blacklist.includes(address.toLowerCase())) {
				let proof = [];
				return apiResponse.successResponseWithData(res, "Operation success", {proof});
			}

			let proof = await ProofService.getRewardProof(address, timestamp);

			if (proof) {
				return apiResponse.successResponseWithData(res, "Operation success", proof);
			}

			return apiResponse.ErrorResponse(res, "Wrong data");
		} catch (err) {
			console.log(err);
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.getRewardProofs = [
	async function (req, res) {
		try {
			let { address, timestamps } = req.body;

			if (!address || !timestamps) {
				return apiResponse.ErrorResponse(res, "Missing request data");
			}

			let timestampArray = timestamps.split(",");

			let data = timestampArray.map((timestamp) => {
				return {
					address,
					timestamp
				}
			});

			// if (["0x8dDB2D1444dFD8f02facc19b15207563Cc7f6eD9", "0x1D0291245E954c11B481f713354D79B1747cAa0E", "0x05ea9701d37ca0db25993248e1d8461A8b50f24a", "0xC9014432072Bf000d9F299D89C4F79650E957ac8", "0xCB2FDD392CBb20737D7A164b65177b671a433F01"].includes(address)) {
			// 	let proof = await ProofService.getRewardProofs(data);

			// 	if (proof.length) {
			// 		return apiResponse.successResponseWithData(res, "Operation success", {proof});
			// 	}

			// 	return apiResponse.ErrorResponse(res, "Wrong data");
			// }

			// let proof = [];

			// return apiResponse.successResponseWithData(res, "Operation success", proof);

			if (blacklist.includes(address.toLowerCase())) {
				let proof = [];
				return apiResponse.successResponseWithData(res, "Operation success", {proof});
			}

			let proof = await ProofService.getRewardProofs(data);

			if (proof.length) {
				return apiResponse.successResponseWithData(res, "Operation success", {proof});
			}

			return apiResponse.ErrorResponse(res, "Wrong data");
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];
