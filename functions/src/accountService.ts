import { Firestore, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const AGENCY_NUMBER = '0001';
const COUNTERS_COLLECTION = 'counters';
const ACCOUNT_COUNTER_DOC = 'bank-account-counter';

const formatAccountNumber = (value: number): string => {
  const baseNumberStr = String(value).padStart(6, '0');
  const checkDigit = calculateCheckDigit(baseNumberStr);
  return `${baseNumberStr}-${checkDigit}`;
};

const calculateCheckDigit = (baseNumber: string): string => {
  const sum = multipleDigitsPerWeight(baseNumber);
  const validatorDigit = sumPerModule11(sum);

  if (validatorDigit === 10 || validatorDigit >= 10) {
    return '0';
  }

  return String(validatorDigit);
};

const multipleDigitsPerWeight = (baseNumber: string): number => {
  let sum = 0;
  let weight = 2;

  for (let index = baseNumber.length - 1; index >= 0; index -= 1) {
    sum += parseInt(baseNumber.charAt(index), 10) * weight;
    if (weight < 7) {
      weight += 1;
    } else {
      weight = 2;
    }
  }

  return sum;
};

const sumPerModule11 = (sum: number): number => {
  const remainder = sum % 11;
  return 11 - remainder;
};

export interface EnsureBankAccountParams {
  uid: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  allowCreate?: boolean;
}

export interface EnsureBankAccountResult {
  accountDoc: DocumentSnapshot<DocumentData>;
  created: boolean;
}

export const ensureBankAccountForUser = async (
  db: Firestore,
  params: EnsureBankAccountParams,
): Promise<EnsureBankAccountResult> => {
  const { uid, ownerName, ownerEmail, allowCreate = true } = params;

  if (!uid) {
    throw new HttpsError('invalid-argument', 'O identificador do usuário (uid) é obrigatório.');
  }

  const accountsRef = db.collection('bank-accounts');
  const snapshot = await accountsRef.where('uid', '==', uid).limit(1).get();

  if (!snapshot.empty) {
    return {
      accountDoc: snapshot.docs[0],
      created: false,
    };
  }

  if (!allowCreate) {
    throw new HttpsError(
      'failed-precondition',
      'Nenhuma conta bancária foi encontrada para o usuário autenticado.',
    );
  }

  const normalizedOwnerName = ownerName?.trim();
  const normalizedOwnerEmail = ownerEmail?.trim().toLowerCase();

  if (!normalizedOwnerName) {
    throw new HttpsError(
      'invalid-argument',
      'O nome do titular da conta é obrigatório para criar uma nova conta bancária.',
    );
  }

  if (!normalizedOwnerEmail) {
    throw new HttpsError(
      'invalid-argument',
      'O e-mail do titular da conta é obrigatório para criar uma nova conta bancária.',
    );
  }

  const accountNumber = await getNextAccountNumber(db);
  const now = new Date().toISOString();

  const docRef = await accountsRef.add({
    accountNumber,
    agency: AGENCY_NUMBER,
    balanceInCents: 0,
    ownerName: normalizedOwnerName,
    ownerEmail: normalizedOwnerEmail,
    createdAt: now,
    updatedAt: now,
    uid,
  });

  const documentSnapshot = await docRef.get();

  return {
    accountDoc: documentSnapshot,
    created: true,
  };
};

const getNextAccountNumber = async (db: Firestore): Promise<string> => {
  const counterRef = db.collection(COUNTERS_COLLECTION).doc(ACCOUNT_COUNTER_DOC);

  const nextNumber = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentNumber = counterDoc.data()?.currentNumber || 0;
    const upcomingNumber = currentNumber + 1;
    transaction.set(counterRef, { currentNumber: upcomingNumber }, { merge: true });
    return upcomingNumber;
  });

  return formatAccountNumber(nextNumber);
};
