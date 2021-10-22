const Web3Util = require("web3-utils");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const axios = require("axios");
const Web3 = require("web3");
const Reward = require("../models/RewardModel");

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

const rewardFreeContract = new web3.eth.Contract(
	require("../abis/RewardFree.json"),
	process.env.REWARD_FREE_CONTRACT
);

const rewardPremiumContract = new web3.eth.Contract(
	require("../abis/RewardPremium.json"),
	process.env.REWARD_PREMIUM_CONTRACT
);

exports.getRewardFromServer = async function(currentTime) {
	try {
		// const currentTime = Math.floor(Date.now() / 1000);
		const last10Days = currentTime - (86400 * 10);
		// const response = await axios.get(`process.env.GET_REWARD_API?${time}=${currentTime}`);
		// const data = response.data.$values;

		// Fake data start
		let data = [];
		data.push({
			walletId: "0x05ea9701d37ca0db25993248e1d8461A8b50f24a",
			type: "paid",
			reward: 100
		})
		data.push({
			walletId: "0xC703F2c6C13F71B359f41Ad10e522e74F0bE6295",
			type: "free",
			reward: 100
		})
		// Fake data end

		let users = data.map((user) => {
			return {
				timestamp: currentTime,
				address: user.walletId,
				reward: user.reward,
				type: user.type
			}
		});

		await Reward.insertMany(users);

		return users;
	} catch(error) {
		console.log(error);
		return [];
	}
}

exports.getRewardFreeProof = async function(address, timestamp) {
	try {
		let users = await Reward.find({timestamp});
		let leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		));
		let tree = new MerkleTree(leaves, keccak256, { sort: true });
		let user = await Reward.findOne({address, timestamp});
		console.log(user.address);
		console.log(user.reward);
		console.log(user.timestamp);
		let leaf = Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		);
		let proof = tree.getHexProof(leaf);
		return proof;
	} catch(error) {
		console.log(error);
		return null;
	}
};

exports.updateRewardRoot = async function() {
	try {
		const currentTime = Math.floor(Date.now() / 1000);
		const users = await getRewardFromServer(currentTime);
		const data = await Promise.all(users.map(async (user) => {
			if (user.type === 'paid') {
				return {
					address: user.address,
					reward: user.reward,
				}
			}

			if (user.type === 'free') {
				let prevRewards = await Reward.find({timestamp: {$gte: currentTime - (86400 * 10)}, address: user.address });
				let totalReward = 0;
				if (prevRewards) {
					prevRewards.forEach((prev) => {
						totalReward += parseInt(prev.reward);
					});
				}
			}
		}));
	} catch(error) {

	}
}

exports.updateRewardFreeRoot = async function() {
	try {
		const currentTime = Math.floor(Date.now() / 1000);
		const response = await axios.get(`process.env.GET_REWARD_API?${time}=${currentTime}`);
		// const data = response.data.$values;

		const users = [];
		data.forEach((user) => {
			users.push({
				address: user.address,
				reward: user.reward,
			});
		});

		const leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		));
		
		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log("root", root);
		console.log("timestamp", currentTime);

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
		
		let inserts = users.map(user => {
			return {
				address: user.address,
				reward: user.reward,
				timestamp: currentTime
			};
		});
		
		await Reward.insertMany(inserts);

		return true;
	} catch(error) {
		console.log(error);
		return false;
	}
};

exports.getRewardPremiumProof = async function(address, timestamp) {
	try {
		let users = await Reward.find({timestamp});
		let leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		));
		let tree = new MerkleTree(leaves, keccak256, { sort: true });
		let user = await Reward.findOne({address, timestamp});
		let leaf = Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		);
		let proof = tree.getHexProof(leaf);
		return proof;
	} catch(error) {
		console.log(error);
		return null;
	}
};

exports.updateRewardPremiumRoot = async function() {
	try {
		// const response = await axios.get(process.env.GET_REWARD_API);
		// const data = response.data.$values;

		const currentTime = Math.floor(Date.now() / 1000);

		const data = require("../mockups/reward.json").users;

		const users = [];
		data.forEach((user) => {
			users.push({
				address: user.address,
				reward: user.reward,
			});
		});

		const leaves = users.map(user => Web3Util.soliditySha3(
			{type: "address", value: user.address},
			{type: "uint256", value: web3.utils.toWei(user.reward, "ether")},
		));
		
		const tree = new MerkleTree(leaves, keccak256, { sort: true });
		const root = tree.getHexRoot();

		console.log("root", root);
		console.log("timestamp", currentTime);

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
		
		let inserts = users.map(user => {
			return {
				address: user.address,
				reward: user.reward,
				timestamp: currentTime
			};
		});
		
		await Reward.insertMany(inserts);

		return true;
	} catch(error) {
		console.log(error);
		return false;
	}
};
