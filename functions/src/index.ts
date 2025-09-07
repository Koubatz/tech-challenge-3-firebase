import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";
import { healthCheck } from "./healthCheck";
import { createBankAccount } from "./createBankAccount";
import { getAccountDetails } from "./getAccountDetails";
import { getAccountStatement } from "./getAccountStatement";
import { performTransaction } from "./performTransaction";

setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin SDK.
// This is required for the function to have permission to write to Firestore.
initializeApp();

exports.healthCheck = healthCheck;
exports.createBankAccount = createBankAccount;
exports.getAccountDetails = getAccountDetails;
exports.getAccountStatement = getAccountStatement;
exports.performTransaction = performTransaction;
