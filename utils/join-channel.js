'use strict'

var util = require("util");
var helper = require("./helper.js");
var logger = helper.getLogger("Join-Channel");
// var tx_id = null;
// var config = require("../configs/envs/config.json");
// var allEventhubs = [];

//
//Attempt to send a request to the orderer with the sendCreateChain method
//
// var joinChannel = function(channelName, peers, username, org) {
//   // on process exit, always disconnect the event hub
//   var closeConnections = function(isSuccess) {
//     if (isSuccess) {
//       logger.debug("\n============ Join Channel is SUCCESS ============\n");
//     } else {
//       logger.debug("\n!!!!!!!! ERROR: Join Channel FAILED !!!!!!!!\n");
//     }
//     logger.debug("");
//     for (var key in allEventhubs) {
//       var eventhub = allEventhubs[key];
//       if (eventhub && eventhub.isconnected()) {
//         //logger.debug('Disconnecting the event hub');
//         eventhub.disconnect();
//       }
//     }
//   };
//   //logger.debug('\n============ Join Channel ============\n')
//   logger.info(
//     util.format('Calling peers in organization "%s" to join the channel', org)
//   );

//   var client = helper.getClientForOrg(org);
//   var channel = helper.getChannelForOrg(org);
//   var eventhubs = [];

//   return helper
//     .getOrgAdmin(org)
//     .then(admin => {
//       logger.info(
//         util.format(
//           'received member object for admin of the organization "%s": ',
//           org
//         )
//       );
//       tx_id = client.newTransactionID();
//       let request = {
//         txId: tx_id
//       };

//       return channel.getGenesisBlock(request);
//     })
//     .then(
//       genesis_block => {
//         tx_id = client.newTransactionID();
//         var request = {
//           targets: helper.newPeers(peers, org),
//           txId: tx_id,
//           block: genesis_block
//         };

//         eventhubs = helper.newEventHubs(peers, org);
//         for (let key in eventhubs) {
//           let eh = eventhubs[key];
//           eh.connect();
//           allEventhubs.push(eh);
//         }

//         var eventPromises = [];
//         eventhubs.forEach(eh => {
//           let txPromise = new Promise((resolve, reject) => {
//             let handle = setTimeout(reject, parseInt(config.eventWaitTime));
//             eh.registerBlockEvent(block => {
//               clearTimeout(handle);
//               // in real-world situations, a peer may have more than one channels so
//               // we must check that this block came from the channel we asked the peer to join
//               if (block.data.data.length === 1) {
//                 // Config block must only contain one transaction
//                 var channel_header =
//                   block.data.data[0].payload.header.channel_header;
//                 if (channel_header.channel_id === channelName) {
//                   resolve();
//                 } else {
//                   reject();
//                 }
//               }
//             });
//           });
//           eventPromises.push(txPromise);
//         });
//         let sendPromise = channel.joinChannel(request);
//         return Promise.all([sendPromise].concat(eventPromises));
//       },
//       err => {
//         logger.error(
//           "Failed to enroll user '" + username + "' due to error: " + err.stack
//             ? err.stack
//             : err
//         );
//         throw new Error(
//           "Failed to enroll user '" + username + "' due to error: " + err.stack
//             ? err.stack
//             : err
//         );
//       }
//     )
//     .then(
//       results => {
//         logger.debug(util.format("Join Channel R E S P O N S E : %j", results));
//         if (
//           results[0] &&
//           results[0][0] &&
//           results[0][0].response &&
//           results[0][0].response.status == 200
//         ) {
//           logger.info(
//             util.format(
//               "Successfully joined peers in organization %s to the channel '%s'",
//               org,
//               channelName
//             )
//           );
//           closeConnections(true);
//           let response = {
//             success: true,
//             message: util.format(
//               "Successfully joined peers in organization %s to the channel '%s'",
//               org,
//               channelName
//             )
//           };
//           return response;
//         } else {
//           logger.error(" Failed to join channel");
//           closeConnections();
//           throw new Error("Failed to join channel");
//         }
//       },
//       err => {
//         logger.error(
//           "Failed to join channel due to error: " + err.stack ? err.stack : err
//         );
//         closeConnections();
//         throw new Error(
//           "Failed to join channel due to error: " + err.stack ? err.stack : err
//         );
//       }
//     );
// };

var joinChannel = async function(channel_name, peers, username, org_name) {
	logger.debug('\n\n============ Join Channel start ============\n')
	var error_message = null;
	var all_eventhubs = [];
	try {
		logger.info('Calling peers in organization "%s" to join the channel', org_name);

		// first setup the client for this org
		var client = await helper.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
		var channel = client.getChannel(channel_name);
		if(!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channel_name);
			logger.error(message);
			throw new Error(message);
		}

		// next step is to get the genesis_block from the orderer,
		// the starting point for the channel that we want to join
		let request = {
			txId : 	client.newTransactionID(true) //get an admin based transactionID
		};
		let genesis_block = await channel.getGenesisBlock(request);

		// tell each peer to join and wait 10 seconds
		// for the channel to be created on each peer
		var promises = [];
		promises.push(new Promise(resolve => setTimeout(resolve, 10000)));

		let join_request = {
			targets: peers, //using the peer names which only is allowed when a connection profile is loaded
			txId: client.newTransactionID(true), //get an admin based transactionID
			block: genesis_block
		};
		let join_promise = channel.joinChannel(join_request);
		promises.push(join_promise);
		let results = await Promise.all(promises);
		logger.debug(util.format('Join Channel R E S P O N S E : %j', results));

		// lets check the results of sending to the peers which is
		// last in the results array
		let peers_results = results.pop();
		// then each peer results
		for(let i in peers_results) {
			let peer_result = peers_results[i];
			if (peer_result instanceof Error) {
				error_message = util.format('Failed to join peer to the channel with error :: %s', peer_result.toString());
				logger.error(error_message);
			} else if(peer_result.response && peer_result.response.status == 200) {
				logger.info('Successfully joined peer to the channel %s',channel_name);
			} else {
				error_message = util.format('Failed to join peer to the channel %s',channel_name);
				logger.error(error_message);
			}
		}
	} catch(error) {
		logger.error('Failed to join channel due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	}

	// need to shutdown open event streams
	all_eventhubs.forEach((eh) => {
		eh.disconnect();
	});

	if (!error_message) {
		let message = util.format(
			'Successfully joined peers in organization %s to the channel:%s',
			org_name, channel_name);
		logger.info(message);
		// build a response to send back to the REST caller
		const response = {
			success: true,
			message: message
		};
		return response;
	} else {
		let message = util.format('Failed to join all peers to channel. cause:%s',error_message);
		logger.error(message);
		// build a response to send back to the REST caller
		const response = {
			success: false,
			message: message
		};
		return response;
	}
};

exports.joinChannel = joinChannel;
