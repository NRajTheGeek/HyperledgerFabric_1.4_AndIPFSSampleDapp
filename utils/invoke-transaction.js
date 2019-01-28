"use strict";
var util = require("util");
var helper = require("./helper.js");
var logger = helper.getLogger("invoke-chaincode");

// var invokeChaincode = function(
//   peerNames,
//   channelName,
//   chaincodeName,
//   fcn,
//   args,
//   username,
//   org
// ) {
//   logger.debug(
//     util.format(
//       "\n============ invoke transaction on organization %s ============\n",
//       org
//     )
//   );
//   var client = helper.getClientForOrg(org);
//   var channel = helper.getChannelForOrg(org);
//   var targets = peerNames ? helper.newPeers(peerNames, org) : undefined;
//   var tx_id = null;

//   return helper
//     .getRegisteredUsers(username, org)
//     .then(
//       user => {
//         tx_id = client.newTransactionID();
//         logger.debug(util.format('Sending transaction "%j"', tx_id));
//         // send proposal to endorser
//         var request = {
//           chaincodeId: chaincodeName,
//           fcn: fcn,
//           args: args,
//           chainId: channelName,
//           txId: tx_id
//         };

//         if (targets) request.targets = targets;

//         return channel.sendTransactionProposal(request);
//       },
//       err => {
//         logger.error("Failed to enroll user '" + username + "'. " + err);
//         throw new Error("Failed to enroll user '" + username + "'. " + err);
//       }
//     )
//     .then(
//       results => {
//         var proposalResponses = results[0];
//         var proposal = results[1];
//         var all_good = true;
//         for (var i in proposalResponses) {
//           let one_good = false;
//           if (
//             proposalResponses &&
//             proposalResponses[i].response &&
//             proposalResponses[i].response.status === 200
//           ) {
//             one_good = true;
//             logger.info("transaction proposal was good");
//           } else {
//             logger.error("transaction proposal was bad");
//           }
//           all_good = all_good & one_good;
//         }
//         if (all_good) {
//           logger.debug(
//             util.format(
//               'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
//               proposalResponses[0].response.status,
//               proposalResponses[0].response.message,
//               proposalResponses[0].response.payload,
//               proposalResponses[0].endorsement.signature
//             )
//           );
//           var request = {
//             proposalResponses: proposalResponses,
//             proposal: proposal
//           };
//           // set the transaction listener and set a timeout of 30sec
//           // if the transaction did not get committed within the timeout period,
//           // fail the test
//           var transactionID = tx_id.getTransactionID();
//           var eventPromises = [];

//           if (!peerNames) {
//             peerNames = channel.getPeers().map(function(peer) {
//               return peer.getName();
//             });
//           }

//           var eventhubs = helper.newEventHubs(peerNames, org);
//           for (let key in eventhubs) {
//             let eh = eventhubs[key];
//             eh.connect();

//             let txPromise = new Promise((resolve, reject) => {
//               let handle = setTimeout(() => {
//                 eh.disconnect();
//                 reject();
//               }, 30000);

//               eh.registerTxEvent(transactionID, (tx, code) => {
//                 clearTimeout(handle);
//                 eh.unregisterTxEvent(transactionID);
//                 eh.disconnect();

//                 if (code !== "VALID") {
//                   logger.error(
//                     "The balance transfer transaction was invalid, code = " +
//                       code
//                   );
//                   reject();
//                 } else {
//                   logger.info(
//                     "The balance transfer transaction has been committed on peer " +
//                       eh._ep._endpoint.addr
//                   );
//                   resolve();
//                 }
//               });
//             });
//             eventPromises.push(txPromise);
//           }
//           var sendPromise = channel.sendTransaction(request);
//           return Promise.all([sendPromise].concat(eventPromises))
//             .then(results => {
//               logger.debug(" event promise all complete and testing complete");
//               return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
//             })
//             .catch(err => {
//               logger.error(
//                 "Failed to send transaction and get notifications within the timeout period."
//               );
//               return "Failed to send transaction and get notifications within the timeout period.";
//             });
//         } else {
//           logger.error(
//             "Failed to send Proposal or receive valid response. Response null or status is not 200. exiting..."
//           );
//           return "Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...";
//         }
//       },
//       err => {
//         logger.error(
//           "Failed to send proposal due to error: " + err.stack ? err.stack : err
//         );
//         return "Failed to send proposal due to error: " + err.stack
//           ? err.stack
//           : err;
//       }
//     )
//     .then(
//       response => {
//         if (response.status === "SUCCESS") {
//           logger.info("Successfully sent transaction to the orderer.");
//           return {
//             txId: tx_id.getTransactionID(),
//             response: response
//           };
//         } else {
//           logger.error(
//             "Failed to order the transaction. Error code: " + response
//           );
//           return "Failed to order the transaction. Error code: " + response;
//         }
//       },
//       err => {
//         logger.error(
//           "Failed to send transaction due to error: " + err.stack
//             ? err.stack
//             : err
//         );
//         return "Failed to send transaction due to error: " + err.stack
//           ? err.stack
//           : err;
//       }
//     );
// };

const invokeChaincode = async function(peerNames, channelName, chaincodeName, fcn, args, username, org_name) {
	logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));
	let error_message = null;
	let tx_id_string = null;
	let client = null;
	let channel = null;
	try {
		// first setup the client for this org
		client = await helper.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
		channel = client.getChannel(channelName);
		if(!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			logger.error(message);
			throw new Error(message);
		}
		const tx_id = client.newTransactionID();
		// will need the transaction ID string for the event registration later
		tx_id_string = tx_id.getTransactionID();

		// send proposal to endorser
		const request = {
			targets: peerNames,
			chaincodeId: chaincodeName,
			fcn: fcn,
			args: args,
			chainId: channelName,
			txId: tx_id
		};

		let results = await channel.sendTransactionProposal(request);

		// the returned object has both the endorsement results
		// and the actual proposal, the proposal will be needed
		// later when we send a transaction to the orderer
		const proposalResponses = results[0];
		const proposal = results[1];

		// look at the responses to see if they are all are good
		// response will also include signatures required to be committed
		let all_good = true;
		for (const i in proposalResponses) {
			if (proposalResponses[i] instanceof Error) {
				all_good = false;
				error_message = util.format('invoke chaincode proposal resulted in an error :: %s', proposalResponses[i].toString());
				logger.error(error_message);
			} else if (proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				logger.info('invoke chaincode proposal was good');
			} else {
				all_good = false;
				error_message = util.format('invoke chaincode proposal failed for an unknown reason %j', proposalResponses[i]);
				logger.error(error_message);
			}
		}

		if (all_good) {
			logger.info(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
				proposalResponses[0].response.status, proposalResponses[0].response.message,
				proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));

			// wait for the channel-based event hub to tell us
			// that the commit was good or bad on each peer in our organization
			const promises = [];
			let event_hubs = channel.getChannelEventHubsForOrg();
			event_hubs.forEach((eh) => {
				logger.debug('invokeEventPromise - setting up event');
				let invokeEventPromise = new Promise((resolve, reject) => {
					let event_timeout = setTimeout(() => {
						let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
						logger.error(message);
						eh.disconnect();
					}, 3000);
					eh.registerTxEvent(tx_id_string, (tx, code, block_num) => {
						logger.info('The chaincode invoke chaincode transaction has been committed on peer %s',eh.getPeerAddr());
						logger.info('Transaction %s has status of %s in blocl %s', tx, code, block_num);
						clearTimeout(event_timeout);

						if (code !== 'VALID') {
							let message = util.format('The invoke chaincode transaction was invalid, code:%s',code);
							logger.error(message);
							reject(new Error(message));
						} else {
							let message = 'The invoke chaincode transaction was valid.';
							logger.info(message);
							resolve(message);
						}
					}, (err) => {
						clearTimeout(event_timeout);
						logger.error(err);
						reject(err);
					},
						// the default for 'unregister' is true for transaction listeners
						// so no real need to set here, however for 'disconnect'
						// the default is false as most event hubs are long running
						// in this use case we are using it only once
						{unregister: true, disconnect: true}
					);
					eh.connect();
				});
				promises.push(invokeEventPromise);
			});

			const orderer_request = {
				txId: tx_id,
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			const sendPromise = channel.sendTransaction(orderer_request);
			// put the send to the orderer last so that the events get registered and
			// are ready for the orderering and committing
			promises.push(sendPromise);
			let results = await Promise.all(promises);
			logger.debug(util.format('------->>> R E S P O N S E : %j', results));
			let response = results.pop(); //  orderer results are last in the results
			if (response.status === 'SUCCESS') {
				logger.info('Successfully sent transaction to the orderer.');
			} else {
				error_message = util.format('Failed to order the transaction. Error code: %s',response.status);
				logger.debug(error_message);
			}

			// now see what each of the event hubs reported
			for(let i in results) {
				let event_hub_result = results[i];
				let event_hub = event_hubs[i];
				logger.debug('Event results for event hub :%s',event_hub.getPeerAddr());
				if(typeof event_hub_result === 'string') {
					logger.debug(event_hub_result);
				} else {
					if(!error_message) error_message = event_hub_result.toString();
					logger.debug(event_hub_result.toString());
				}
			}
		}
	} catch (error) {
		logger.error('Failed to invoke due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	} finally {
		if (channel) {
			channel.close();
		}
	}

	let success = true;
	let message = util.format(
		'Successfully invoked the chaincode %s to the channel \'%s\' for transaction ID: %s',
		org_name, channelName, tx_id_string);
	if (error_message) {
		message = util.format('Failed to invoke chaincode. cause:%s',error_message);
		success = false;
		logger.error(message);
	} else {
		logger.info(message);
	}

	// build a response to send back to the REST caller
	const response = {
		success: success,
		message: message
	};
	return response;
};
exports.invokeChaincode = invokeChaincode;
