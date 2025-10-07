import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions';
import { createBankAccount } from './createBankAccount';
import { createPaymentCard } from './createPaymentCard';
import { deletePaymentCard } from './deletePaymentCard';
import { getAccountDetails } from './getAccountDetails';
import { getAccountStatement } from './getAccountStatement';
import { getPaymentCardTransactions } from './getPaymentCardTransactions';
import { getYearlyTransactions } from './getYearlyTransactions';
import { healthCheck } from './healthCheck';
import { listPaymentCards } from './listPaymentCards';
import { performTransaction } from './performTransaction';

setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin SDK.
// This is required for the function to have permission to write to Firestore.
initializeApp();

exports.healthCheck = healthCheck;
exports.createBankAccount = createBankAccount;
exports.getAccountDetails = getAccountDetails;
exports.getAccountStatement = getAccountStatement;
exports.getYearlyTransactions = getYearlyTransactions;
exports.performTransaction = performTransaction;
exports.listPaymentCards = listPaymentCards;
exports.createPaymentCard = createPaymentCard;
exports.getPaymentCardTransactions = getPaymentCardTransactions;
exports.deletePaymentCard = deletePaymentCard;
