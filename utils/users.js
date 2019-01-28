'use strict'

var hfc = require("fabric-client");
var helper = require("./helper");
var log4js = require("log4js");
var logger = log4js.getLogger("Helper");

// var async = require("async");
// const User = require("fabric-client/lib/User.js");
// var registerUserService = function(uuid, org, isJson) {
//   return new Promise((resolve, reject) => {
//     var client;
//     try {
//       client = helper.getClientForOrg(org);
//     } catch (err) {
//       logger.error(err.stack ? err.stack : err);
//       return reject({
//         err: new Error("error getting client for org."),
//         data: null
//       });
//     }

//     enrollUser(client, uuid, org)
//       .then(enrolleOb => {
//         var user = enrolleOb.data;
//         if (user._enrollmentSecret === "") {
//           var response = {
//             success: false,
//             message: "user enrollment failed"
//           };
//           // toward the next then in the chain
//           return response;
//         } else {
//           // return generateResponse(user, uuid, org, callback, isJson);
//           return generateResponse(user, uuid, org, isJson);
//         }
//       })
//       .then(enrolleOb => {
//         resolve({
//           err: null,
//           data: enrolleOb.data
//         });
//       })
//       .catch(errOb => {
//         resolve({
//           err: errOb.err,
//           data: null
//         });
//       });
//   });
// };

// var enrollUser = function(client, uuid, org) {
//   return new Promise((resolve, reject) => {
//     var member;

//     var enrollmentSecret = null;
//     hfc
//       .newDefaultKeyValueStore({
//         path: helper.getKeyStoreForOrg(helper.getOrgName(org))
//       })
//       .then(store => {
//         client.setStateStore(store);
//         client._userContext = null;

//         return client.getUserContext(uuid, true).then(user => {
//           // if (user && user.isEnrolled()) {_enrollmentSecret
//           if (user && user._enrollmentSecret.length > 0) {
//             logger.info("Successfully loaded member from persistence");

//             user.isEnrolled = true;
//             return user;
//           } else {
//             let caClient = helper.getCaClientForOrg(org);
//             return helper
//               .getAdminUser(org)
//               .then(function(adminUserObj) {
//                 member = adminUserObj;
//                 return caClient.register(
//                   {
//                     enrollmentID: uuid,
//                     affiliation: org + ".department1"
//                   },
//                   member
//                 );
//               })
//               .then(
//                 secret => {
//                   enrollmentSecret = secret;
//                   logger.debug(uuid + " registered successfully");

//                   return caClient.enroll({
//                     enrollmentID: uuid,
//                     enrollmentSecret: secret
//                   });
//                 },
//                 err => {
//                   logger.debug(uuid + " failed to register");

//                   if (!err || err === undefined) {
//                     err = new Error(uuid + " failed to register");
//                   } else {
//                     err.message =
//                       uuid + " failed to register: " + err.message
//                         ? err.message
//                         : err;
//                   }

//                   reject({
//                     err: err,
//                     data: null
//                   });
//                 }
//               )
//               .then(message => {
//                 if (
//                   message &&
//                   typeof message === "string" &&
//                   message.includes("Error:")
//                 ) {
//                   logger.error(uuid + " enrollment failed");

//                   reject({
//                     err: new Error(uuid + " enrollment failed"),
//                     data: null
//                   });
//                 }

//                 logger.debug(uuid + " enrolled successfully");
//                 member = new User(uuid);
//                 member._enrollmentSecret = enrollmentSecret;

//                 return member.setEnrollment(
//                   message.key,
//                   message.certificate,
//                   helper.getMspID(org)
//                 );
//               })
//               .then(
//                 () => {
//                   client.setUserContext(member);
//                   return member;
//                 },
//                 err => {
//                   logger.error(
//                     uuid + " enroll failed: " + err.stack ? err.stack : err
//                   );
//                   if (!err || err === undefined) {
//                     err = new Error("enroll failed: " + uuid);
//                   } else {
//                     err.message =
//                       uuid + " enroll failed: " + err.message
//                         ? err.message
//                         : err;
//                   }

//                   reject({
//                     err: err,
//                     data: null
//                   });
//                 }
//               );
//           }
//         });
//       })
//       .then(user => {
//         if (!user || user === undefined) {
//           reject({
//             err: new Error("An error occured in user registeration!!"),
//             data: null
//           });
//         } else {
//           resolve({ err: null, data: user });
//         }
//       })
//       .catch(err => {
//         reject({
//           err: new Error("An error occured in user registeration!!"),
//           data: null
//         });
//       });
//   });
// };

// var generateResponse = function(user, uuid, org, isJson) {
//   return new Promise(async (resolve, reject) => {
//     if (user.isEnrolled === true) {
//       if (!isJson || isJson === false) {
//         return user;
//       } else {
//         var response = {
//           success: false,
//           message: "User already exists."
//         };
//         resolve({ err: null, data: response });
//       }
//     } else {
//       if (isJson && isJson === true) {
//         var response = {
//           secret: user._enrollmentSecret,
//           message: uuid + " enrolled Successfully"
//         };

//         resolve({
//           err: null,
//           data: response
//         });

//         //====================================================================================================

//         keyPair = await helper.generateRSAKeyPair();
//         var pub_k = keyPair.data.RSAPublicKey;
//         var pri_k = keyPair.data.RSAPrivateKey;

//         logger.debug(
//           "\n==================================== pub_k   \n" + pub_k
//         );

//         logger.debug(
//           "\n==================================== pri_k   \n" + pri_k
//         );

//         var encryptedRSAPrivKey = helper.aesSymmetricEncryption(
//           user._enrollmentSecret,
//           pri_k
//         );
//         logger.debug(
//           "\n==================================== encryptedRSAPrivKey   \n" +
//             encryptedRSAPrivKey
//         );

//         var content = {};
//         content.rsaPublicKey = pub_k;
//         content.encryptedRsaPrivKey = encryptedRSAPrivKey;

//         //====================================================================================================
//         helper
//           .hashingData(user._enrollmentSecret)
//           .then(async hashedEnrollmentOb => {
//             logger.debug(
//               " \n =========================================== \n hashedEnrollmentOb.data:   " +
//                 hashedEnrollmentOb.data
//             );

//             var userData = {
//               secret: hashedEnrollmentOb.data,
//               privRSA: encryptedRSAPrivKey,
//               pubRSA: pub_k,
//               org: org
//             };
//             console.log("before save");

//             await helper.checkAndPersistUser(uuid, userData);
//           })
//           .catch(errOb => {
//             reject({
//               err:
//                 "Failed to get public key from keystore of user: " +
//                 uuid +
//                 " error: " +
//                 errOb.err,
//               data: null
//             });
//           });
//       } else {
//         reject(new Error("user cretaion error!!, contact admin."));
//       }
//     }
//   });
// };

//===========================================================================================================
var registerUserService = async function(username, userOrg, isJson) {
  var secret;
  try {
    var client = await helper.getClientForOrg(userOrg);
    logger.debug("Successfully initialized the credential stores");
    // client can now act as an agent for organization Org1
    // first check to see if the user is already enrolled
    var user = await client.getUserContext(username, true);
    if (user && user.isEnrolled()) {
      logger.info("Successfully loaded member from persistence");
    } else {
      // user was not enrolled, so we will need an admin user object to register
      logger.info(
        "User %s was not enrolled, so we will need an admin user object to register",
        username
      );
      var admins = hfc.getConfigSetting("admins");
      let adminUserObj = await client.setUserContext({
        username: admins[0].username,
        password: admins[0].secret
      });
      let caClient = client.getCertificateAuthority();
      secret = await caClient.register(
        {
          enrollmentID: username,
          affiliation: userOrg.toLowerCase() + ".department1"
        },
        adminUserObj
      );
      logger.debug("Successfully got the secret for user %s", username);
      user = await client.setUserContext({
        username: username,
        password: secret
      });
      logger.debug(
        "Successfully enrolled username %s  and setUserContext on the client object",
        username
      );
    }
    if (user && user.isEnrolled) {
      if (isJson && isJson === true) {
        // success: true,
        var response = {
          secret: secret,
          message: username + " enrolled Successfully"
        };

        console.log("user._enrollmentSecret ========================================");
        console.log(secret);
        
        

        var ret = await generateAndPersistUserCredData(secret, username, userOrg);

        // return response
        return {
          err: null,
          data: response
        };
      }
    } else {
      return {
        err: "User was not enrolled ",
        data: null
      };
      // throw new Error("User was not enrolled ");
    }
  } catch (error) {
    logger.error(
      "Failed to get registered user: %s with error: %s",
      username,
      error.toString()
    );
    return {
      err: "failed " + error.toString(),
      data: null
    };
  }
};

var generateAndPersistUserCredData = async function(
  enrollmentSecret,
  uuid,
  org
) {
  var keyPair = await helper.generateRSAKeyPair();
  var pub_k = keyPair.data.RSAPublicKey;
  var pri_k = keyPair.data.RSAPrivateKey;

  logger.debug("\n==================================== pub_k   \n" + pub_k);

  logger.debug("\n==================================== pri_k   \n" + pri_k);

  var encryptedRSAPrivKey = helper.aesSymmetricEncryption(
    enrollmentSecret,
    pri_k
  );
  logger.debug(
    "\n==================================== encryptedRSAPrivKey   \n" +
      encryptedRSAPrivKey
  );

  var content = {};
  content.rsaPublicKey = pub_k;
  content.encryptedRsaPrivKey = encryptedRSAPrivKey;

  //====================================================================================================
  helper
    .hashingData(enrollmentSecret)
    .then(async hashedEnrollmentOb => {
      logger.debug(
        " \n =========================================== \n hashedEnrollmentOb.data:   " +
          hashedEnrollmentOb.data
      );

      var userData = {
        secret: hashedEnrollmentOb.data,
        privRSA: encryptedRSAPrivKey,
        pubRSA: pub_k,
        org: org
      };
      console.log("before save");

      await helper.checkAndPersistUser(uuid, userData);
      return true;
    })
    .catch(errOb => {
      console.log(
        "Failed to get public key from keystore of user: " +
          uuid +
          " error: " +
          errOb.err
      );
      return false;
    });
};

module.exports = {
  registerUserService
};
