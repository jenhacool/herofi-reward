const Web3Util = require("web3-utils");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const axios = require("axios");
const Web3 = require("web3");
const Reward = require("../models/RewardModel");
const RewardDup = require("../models/RewardDupModel");

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

const rewardFreeContract = new web3.eth.Contract(
	require("../abis/RewardFree.json"),
	process.env.REWARD_FREE_CONTRACT
);

const rewardPremiumContract = new web3.eth.Contract(
	require("../abis/RewardPremium.json"),
	process.env.REWARD_PREMIUM_CONTRACT
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
				type: user.type
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
// const getRewardFromServer = async function(currentTime) {
// 	try {
// 		await Reward.deleteMany();
// 		let users = [];
// 		let i = 0;

// 		while(i < 11) {
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0x05ea9701d37ca0db25993248e1d8461A8b50f24a",
// 				reward: 1000,
// 				type: "free"
// 			})
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0x285F11E78923Cb02302E6Fbc92d14744eFe50018",
// 				reward: 1000,
// 				type: "free"
// 			})
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0x1D0291245E954c11B481f713354D79B1747cAa0E",
// 				reward: 1000,
// 				type: "free"
// 			})
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0x8dDB2D1444dFD8f02facc19b15207563Cc7f6eD9",
// 				reward: 2000,
// 				type: "paid"
// 			})
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0xC703F2c6C13F71B359f41Ad10e522e74F0bE6295",
// 				reward: 2000,
// 				type: "paid"
// 			})
// 			users.push({
// 				timestamp: currentTime - (86400 * i),
// 				address: "0xBeD2ff7474dE18298d01CCaE84142177e062C601",
// 				reward: 2000,
// 				type: "paid"
// 			})
// 			i += 1;
// 		}

// 		await Reward.insertMany(users);

// 		return users;
// 	} catch(error) {
// 		console.log(error);
// 		return [];
// 	}
// };

const updateRewardFreeRoot = async function(currentTime, data) {
	try {
		const users = await Promise.all(data.map(async (user) => {
			if (user.type === "free") {
				let prevRewards = await Reward.find({timestamp: {$gt: currentTime - (86400 * 10)}, address: user.address, claimed: false});
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
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether")},
		));
		
		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log(currentTime, "free", root);

		const privateKey = process.env.REWARD_PRIVATE_KEY;
		const transaction = rewardFreeContract.methods.updateMerkleRoot(currentTime, root);
		const options = {
			to: transaction._parent._address,
			data: transaction.encodeABI(),
			gas: await transaction.estimateGas({from: web3.utils.toChecksumAddress(process.env.REWARD_OWNER_ADDRESS)}),
		};
		const signed  = await web3.eth.accounts.signTransaction(options, privateKey);
		const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		if (!receipt.status) {
			return false;
		}

		return true;
	} catch(error) {
		console.log("free root", error);
		return false;
	}
};

const updateRewardPremiumRoot = async function(currentTime, data) {
	try {
		const users = [];

		data.forEach((user) => {
			users.push({
				address: user.address,
				reward: user.reward,
			});
		});

		const leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether")},
		));
		
		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log(currentTime, "premium", root);

		const privateKey = process.env.REWARD_PRIVATE_KEY;
		const transaction = rewardPremiumContract.methods.updateMerkleRoot(currentTime, root);
		const options = {
			to: transaction._parent._address,
			data: transaction.encodeABI(),
			gas: await transaction.estimateGas({from: web3.utils.toChecksumAddress(process.env.REWARD_OWNER_ADDRESS)}),
		};
		const signed  = await web3.eth.accounts.signTransaction(options, privateKey);
		const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		if (!receipt.status) {
			return false;
		}

		return true;
	} catch(error) {
		console.log("premium root", error);
		return false;
	}
};

exports.updateRewardRoot = async function() {
	try {
		const currentTime = Math.floor(Date.now() / 1000);
		const currentData = await Reward.find();
		const users = await getRewardFromServer(currentTime);
		const newData = currentData.concat(users);
		await RewardDup.deleteMany();
		await RewardDup.insertMany(newData);
		const freeUsers = await RewardDup.find({timestamp: {$gt: currentTime - (86400 * 10)}, type: "free"});
		const paidUsers = await RewardDup.find({timestamp: currentTime, type: "paid"});

		await updateRewardFreeRoot(currentTime, freeUsers);
		await updateRewardPremiumRoot(currentTime, paidUsers);

		return true;
	} catch(error) {
		console.log(error);
		return false;
	}
};

exports.getRewardFreeProof = async function(address, timestamp) {
	try {
		const raw = await RewardDup.find({timestamp: {$gt: timestamp - (86400 * 10)}, type: "free"});
		const users = await Promise.all(raw.map(async (user) => {
			if (user.type === "free") {
				let prevRewards = await RewardDup.find({timestamp: {$gt: timestamp - (86400 * 10)}, address: user.address, claimed: false});
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
		let leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether")},
		));
		let tree = new MerkleTree(leaves, keccak256, { sort: true });
		console.log(tree.getHexRoot());
		let prevRewards = await RewardDup.find({timestamp: {$gt: timestamp - (86400 * 10)}, address: address, claimed: false});
		let totalReward = 0;
		if (prevRewards) {
			prevRewards.forEach((prev) => {
				totalReward += parseFloat(prev.reward);
			});
		}
		console.log(totalReward);
		let leaf = Web3Util.soliditySha3(
			{type: "address", value: address},
			{type: "uint256", value: web3.utils.toWei(`${totalReward}`, "ether")},
		);
		let proof = tree.getHexProof(leaf);
		console.log(address, totalReward, timestamp, proof);
		return proof;
	} catch(error) {
		console.log(error);
		return null;
	}
};

exports.getRewardPremiumProof = async function(address, timestamp) {
	try {
		let users = await RewardDup.find({timestamp, type: "paid"});
		let leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether")},
		));
		let tree = new MerkleTree(leaves, keccak256, { sort: true });
		console.log(tree.getHexRoot());
		let user = await RewardDup.findOne({address, timestamp});
		let leaf = Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(`${user.reward}`, "ether")},
		);
		let proof = tree.getHexProof(leaf);
		return proof;
	} catch(error) {
		console.log(error);
		return null;
	}
};
