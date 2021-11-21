const Web3Util = require("web3-utils");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const axios = require("axios");
const Web3 = require("web3");
const Reward = require("../models/RewardModel");
const RewardDup = require("../models/RewardDupModel");
const RewardLog = require("../models/RewardLogModel");

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

const rewardContract = new web3.eth.Contract(
	require("../abis/Reward.json"),
	process.env.REWARD_CONTRACT
);

// Real data
const getRewardFromServer = async function(currentTime) {
	try {
		const response = await axios.get(`${process.env.GET_REWARD_API}&time=${currentTime}`);
		const data = response.data.$values;

		let users = data.map((user) => {
			return {
				timestamp: currentTime,
				address: web3.utils.toChecksumAddress(user.walletId),
				reward: user.reward,
			};
		});

		await Reward.deleteMany({timestamp: currentTime});
		await Reward.insertMany(users);

		return users;
	} catch(error) {
		console.log(error);
		return [];
	}
};

// Fake data
// const getRewardFromServer = async function (currentTime, reward) {
// 	try {
// 		const users = [
// 			{
// 				address: "0x81F403fE697CfcF2c21C019bD546C6b36370458c",
// 				reward: 1 * reward,
// 				timestamp: currentTime
// 			},
// 			{
// 				address: "0x05ea9701d37ca0db25993248e1d8461A8b50f24a",
// 				reward: 1 * reward,
// 				timestamp: currentTime
// 			}
// 		];

// 		await Reward.deleteMany({ timestamp: currentTime });
// 		await Reward.insertMany(users);

// 		return users;
// 	} catch (error) {
// 		console.log(error);
// 		return [];
// 	}
// };

const updateRewardFreeRoot = async function (currentTime, data) {
	try {
		const users = await Promise.all(data.map(async (user) => {
			if (user.type === "free") {
				let prevRewards = await Reward.find({ timestamp: { $gt: currentTime - (86400 * 10) }, address: user.address, claimed: false });
				let totalReward = 0;
				if (prevRewards) {
					prevRewards.forEach((prev) => {
						totalReward += parseFloat(prev.reward);
					});
				}
				return {
					address: user.address,
					reward: parseFloat(totalReward),
				};
			}
		}));

		const leaves = users.map(user => Web3Util.soliditySha3(
			{ type: "address", value: user.address },
			{ type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether") },
		));

		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log(currentTime, "free", root);

		const privateKey = process.env.REWARD_PRIVATE_KEY;
		const transaction = rewardFreeContract.methods.updateMerkleRoot(currentTime, root);
		const options = {
			to: transaction._parent._address,
			data: transaction.encodeABI(),
			gas: await transaction.estimateGas({ from: web3.utils.toChecksumAddress(process.env.REWARD_OWNER_ADDRESS) }),
		};
		const signed = await web3.eth.accounts.signTransaction(options, privateKey);
		const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		if (!receipt.status) {
			return false;
		}

		return true;
	} catch (error) {
		console.log("free root", error);
		return false;
	}
};

const updateRoot = async function (currentTime, users) {
	try {
		const leaves = users.map(user => Web3Util.soliditySha3(
			{ type: "address", value: user.address },
			{ type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether") },
		));

		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log(currentTime, root);

		const privateKey = process.env.REWARD_PRIVATE_KEY;
		const transaction = rewardContract.methods.updateMerkleRoot(currentTime, root);
		const options = {
			to: transaction._parent._address,
			data: transaction.encodeABI(),
			gas: await transaction.estimateGas({ from: web3.utils.toChecksumAddress(process.env.REWARD_OWNER_ADDRESS) }),
		};
		const signed = await web3.eth.accounts.signTransaction(options, privateKey);
		const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		if (!receipt.status) {
			return false;
		}

		return true;
	} catch (error) {
		console.log("update root", error);
		return false;
	}
};

const resetRewardClaimedToday = async function () {
	try {
		const rewardManagerContract = new web3.eth.Contract(
			require("../abis/RewardManager.json"),
			process.env.REWARD_MANAGER_CONTRACT
		);

		const privateKey = process.env.REWARD_PRIVATE_KEY;
		const transaction = rewardManagerContract.methods.setRewardClaimedToday(0);
		const options = {
			to: transaction._parent._address,
			data: transaction.encodeABI(),
			gas: await transaction.estimateGas({ from: web3.utils.toChecksumAddress(process.env.REWARD_OWNER_ADDRESS) }),
		};
		const signed = await web3.eth.accounts.signTransaction(options, privateKey);
		const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		if (!receipt.status) {
			return false;
		}

		return true;
	} catch (error) {
		console.log(error);
		return false;
	}
};

exports.updateRewardRoot = async function () {
	try {
		const currentTime = Math.floor(Date.now() / 1000);
		// const currentData = await Reward.find();
		const users = await getRewardFromServer(currentTime);
		console.log(users.length);
		// const newData = currentData.concat(users);
		// await RewardDup.deleteMany();
		// await RewardDup.insertMany(newData);
		await updateRoot(currentTime, users);
		// await resetRewardClaimedToday();

		return true;
	} catch (error) {
		console.log(error);
		return false;
	}
};

const getProof = async function (address, timestamp) {
	try {
		let users = await Reward.find({ timestamp });
		let leaves = users.map(user => Web3Util.soliditySha3(
			{ type: "address", value: user.address },
			{ type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether") },
		));
		let tree = new MerkleTree(leaves, keccak256, { sort: true });
		console.log(tree.getHexRoot());
		let user = await Reward.findOne({ address, timestamp });
		let leaf = Web3Util.soliditySha3(
			{ type: "address", value: user.address },
			{ type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether") },
		);
		let proof = tree.getHexProof(leaf);
		return proof;
	} catch (error) {
		console.log(error);
		return null;
	}
};

exports.getRewardProof = async function (address, timestamp) {
	let proof = await getProof(address, timestamp);
	return {
		address,
		timestamp,
		proof
	};
};

exports.getRewardProofs = async function (params) {
	let proofs = await Promise.all(params.map(async (param) => {
		let {address, timestamp} = param;
		let proof = await getProof(param.address, param.timestamp);
		return {
			address,
			timestamp,
			proof
		};
	}));
	
	return proofs;
};
