const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));
const Reward = require("../models/RewardModel");
const Event = require("../models/EventModel");

const rewardContract = new web3.eth.Contract(
	require("../abis/Reward.json"),
	process.env.REWARD_CONTRACT
);

const onRewardClaim = async function(event) {
	try {
		let {blockNumber, transactionHash} = event;
		let {user, reward, timestamps} = event.returnValues;
		
		console.log(event.returnValues);

		if (!timestamps) {
			return;
		}

		await Promise.all(timestamps.map(async (timestamp) => {
			let filter = {
				address: user,
				// reward: web3.utils.fromWei(reward, "ether"),
				timestamp,
				claimed: false
			};
			let data = await Reward.findOne({
				address: user,
				// reward: web3.utils.fromWei(reward, "ether"),
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
			console.log("Updated", user, reward, timestamp);
		}));
	} catch(err) {
		console.log(err);
	}
};

const listenEvents = async function() {
	let event = await Event.findOne();
	let eventId = event ? event._id : ""
	if (!event) {
		event = new Event({latestBlock: process.env.START_BLOCK});
		eventId = event._id
		await event.save();
	}
	let i = event.latestBlock;
	try {
		let latestBlockNumber = await web3.eth.getBlockNumber();
		if (latestBlockNumber - event.latestBlock > 5000) {
			i = latestBlockNumber - 2;
		}
		console.log("event", i, latestBlockNumber);
		if (i < latestBlockNumber) {
			await Promise.all((await rewardContract.getPastEvents("RewardClaim", {
				fromBlock: i + 1,
				toBlock: latestBlockNumber
			})).map(onRewardClaim));
			await Event.findByIdAndUpdate(eventId, {latestBlock: latestBlockNumber}, {upsert: true});
			i = latestBlockNumber;
		}
		return setTimeout(() => listenEvents(i), 6000);
	} catch (err) {
		console.error("getEvents err: ", err);
		return setTimeout(() => listenEvents(i), 6000);
	}
};

module.exports = listenEvents;