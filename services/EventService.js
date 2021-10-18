const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));
const Reward = require("../models/RewardModel");
const Event = require("../models/EventModel");

const rewardFreeContract = new web3.eth.Contract(
	require("../abis/RewardFree.json"),
	process.env.REWARD_FREE_CONTRACT
);

const rewardPremiumContract = new web3.eth.Contract(
	require("../abis/RewardPremium.json"),
	process.env.REWARD_PREMIUM_CONTRACT
);

const onRewardClaim = async function(event) {
	try {
		let {blockNumber, transactionHash} = event;
		let {user, reward, timestamp} = event.returnValues;
		let filter = {
			address: user,
			reward: web3.utils.fromWei(reward, "ether"),
			timestamp,
			claimed: false
		};
		let data = await Reward.findOne({
			address: user,
			reward: web3.utils.fromWei(reward, "ether"),
			timestamp,
			claimed: false
		});
		if (!data) {
			return;
		}
		let update = {
			claimed: true, history: {blockNumber, transactionHash}
		};
		await Reward.findOneAndUpdate(filter, update);
		console.log("Updated");
	} catch(err) {
		console.log(err);
	}
};

const listenEvents = async function() {
	let event = await Event.findOne();
	if (!event) {
		event = new Event({latestBlock: process.env.START_BLOCK});
		await event.save();
	}
	let i = event.latestBlock;
	try {
		let latestBlockNumber = await web3.eth.getBlockNumber();
		if (latestBlockNumber - event.latestBlock > 5000) {
			i = latestBlockNumber - 2;
		}
		if (i < latestBlockNumber) {
			await Promise.all((await rewardFreeContract.getPastEvents("RewardClaim", {
				fromBlock: i + 1,
				toBlock: latestBlockNumber
			})).map(onRewardClaim));
			// await Promise.all((await rewardPremiumContract.getPastEvents('RewardClaim', {
			//   fromBlock: i + 1,
			//   toBlock: latestBlockNumber
			// })).map(onRewardClaim));
			await Event.findByIdAndUpdate(event._id, {latestBlock: latestBlockNumber});
			i = latestBlockNumber;
		}
		return setTimeout(() => listenEvents(i), 6000);
	} catch (err) {
		console.error("getEvents err: ", err);
		return setTimeout(() => listenEvents(i), 6000);
	}
};

module.exports = listenEvents;