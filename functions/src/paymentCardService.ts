import {
  FieldValue,
  Firestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {
  PaymentCard,
  PaymentCardTransaction,
  PaymentCardTransactionDirection,
  PaymentCardTransactionType,
  PaymentCardType,
} from './types';

const CARD_NUMBER_PREFIX = '637512';
const CARD_NUMBER_COUNTER_DOC = 'card-number-counter';
const CARD_NUMBER_LENGTH = 16;

type PaymentCardRecord = {
  accountId: string;
  accountNumber: string;
  uid: string;
  cardType: PaymentCardType;
  brand?: string | null;
  label?: string | null;
  maskedNumber?: string | null;
  lastFourDigits?: string | null;
  cardNumber?: string | null;
  invoiceAmountInCents?: number | null;
  invoiceDueDate?: string | null;
  availableLimitInCents?: number | null;
  creditLimitInCents?: number | null;
  createdAt?: Timestamp | FieldValue | null;
  updatedAt?: Timestamp | FieldValue | null;
};

type CardTransactionRecord = {
  cardId: string;
  accountId: string;
  accountNumber: string;
  uid: string;
  type: PaymentCardTransactionType;
  direction?: PaymentCardTransactionDirection;
  amountInCents: number;
  description?: string | null;
  category?: string | null;
  timestamp?: Timestamp | FieldValue | null;
};

const centsToDecimal = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value) / 100;
};

const timestampToIso = (value?: Timestamp | FieldValue | null): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return null;
};

export const mapPaymentCard = (
  doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): PaymentCard => {
  const data = doc.data() as PaymentCardRecord | undefined;

  return {
    id: doc.id,
    cardType: data?.cardType ?? 'CREDIT',
    brand: data?.brand ?? null,
    label: data?.label ?? null,
    maskedNumber: data?.maskedNumber ?? null,
    lastFourDigits: data?.lastFourDigits ?? null,
    cardNumber: data?.cardNumber ?? null,
    accountId: data?.accountId ?? null,
    accountNumber: data?.accountNumber ?? null,
    invoiceAmount: centsToDecimal(data?.invoiceAmountInCents),
    invoiceDueDate: data?.invoiceDueDate ?? null,
    availableLimit: centsToDecimal(data?.availableLimitInCents),
    creditLimit: centsToDecimal(data?.creditLimitInCents),
    createdAt: timestampToIso(data?.createdAt),
    updatedAt: timestampToIso(data?.updatedAt),
  };
};

export const mapPaymentCardTransaction = (
  doc: QueryDocumentSnapshot<DocumentData>,
): PaymentCardTransaction => {
  const data = doc.data() as CardTransactionRecord | undefined;

  const normalizedAmount = centsToDecimal(data?.amountInCents) ?? 0;
  const normalizedType: PaymentCardTransactionType = data?.type ?? 'CARD';
  const normalizedDirection: PaymentCardTransactionDirection | undefined =
    data?.direction === 'DEBIT' || data?.direction === 'CREDIT' ? data.direction : undefined;
  const normalizedTimestamp =
    timestampToIso(data?.timestamp) ?? doc.createTime?.toDate().toISOString() ?? new Date().toISOString();

  return {
    id: doc.id,
    type: normalizedType,
    direction: normalizedDirection,
    description: data?.description ?? null,
    category: data?.category ?? null,
    amount: normalizedAmount,
    timestamp: normalizedTimestamp,
  };
};

export const allowedCardTypes: PaymentCardType[] = ['CREDIT', 'DEBIT', 'PHYSICAL', 'VIRTUAL'];

const formatMaskedCardNumber = (cardNumber: string): string => {
  const digitsOnly = cardNumber.replace(/\D/g, '');

  const masked = digitsOnly
    .split('')
    .map((digit, index) => (index < digitsOnly.length - 4 ? '*' : digit))
    .join('');

  return masked.replace(/(.{4})/g, '$1 ').trim();
};

export const generateUniqueCardNumber = async (
  db: Firestore,
): Promise<{ cardNumber: string; maskedNumber: string; lastFourDigits: string }> => {
  const counterRef = db.collection('counters').doc(CARD_NUMBER_COUNTER_DOC);

  const nextValue = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentValue = counterDoc.data()?.currentValue || 0;
    const updatedValue = currentValue + 1;
    transaction.set(counterRef, { currentValue: updatedValue }, { merge: true });
    return updatedValue;
  });

  const serialLength = CARD_NUMBER_LENGTH - CARD_NUMBER_PREFIX.length;
  const serial = String(nextValue).padStart(serialLength, '0');
  const combined = `${CARD_NUMBER_PREFIX}${serial}`;
  const cardNumber = combined.length > CARD_NUMBER_LENGTH
    ? combined.slice(-CARD_NUMBER_LENGTH)
    : combined.padStart(CARD_NUMBER_LENGTH, '0');
  const maskedNumber = formatMaskedCardNumber(cardNumber);
  const lastFourDigits = cardNumber.slice(-4);

  return {
    cardNumber,
    maskedNumber,
    lastFourDigits,
  };
};

export const getDefaultCardConfig = (
  cardType: PaymentCardType,
): {
  invoiceDueDate: string | null;
  creditLimitInCents: number | null;
  availableLimitInCents: number | null;
} => {
  if (cardType === 'CREDIT') {
    const creditLimitInCents = 250000; // R$ 2.500,00
    return {
      invoiceDueDate: '15',
      creditLimitInCents,
      availableLimitInCents: creditLimitInCents,
    };
  }

  return {
    invoiceDueDate: null,
    creditLimitInCents: null,
    availableLimitInCents: null,
  };
};
