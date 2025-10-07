import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  allowedCardTypes,
  generateUniqueCardNumber,
  getDefaultCardConfig,
  mapPaymentCard,
} from './paymentCardService';
import { ensureBankAccountForUser } from './accountService';
import {
  CreatePaymentCardData,
  CreatePaymentCardResponse,
  PaymentCardType,
} from './types';

const MAX_LABEL_LENGTH = 80;
const MAX_BRAND_LENGTH = 80;

const normalizeString = (value?: unknown, maxLength = 100): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new HttpsError(
      'invalid-argument',
      `O valor informado excede o tamanho máximo permitido (${maxLength} caracteres).`,
    );
  }

  return trimmed;
};

export const createPaymentCard = onCall(async (request): Promise<CreatePaymentCardResponse> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
  }

  const payload = request.data as CreatePaymentCardData | undefined;
  const cardType = payload?.type;

  if (typeof cardType !== 'string') {
    throw new HttpsError('invalid-argument', 'O campo "type" é obrigatório.');
  }

  if (!allowedCardTypes.includes(cardType as PaymentCardType)) {
    throw new HttpsError(
      'invalid-argument',
      'O campo "type" deve ser um dos valores: CREDIT, DEBIT, PHYSICAL ou VIRTUAL.',
    );
  }

  const label = normalizeString(payload?.label, MAX_LABEL_LENGTH);
  const brand = normalizeString(payload?.brand, MAX_BRAND_LENGTH) ?? 'ByteBank';

  const db = getFirestore();

  const ownerNameFromToken =
    (request.auth.token?.name as string | undefined) ??
    (request.auth.token?.email as string | undefined) ??
    payload?.label ??
    'Cliente';

  const { accountDoc } = await ensureBankAccountForUser(db, {
    uid: request.auth.uid,
    ownerName: ownerNameFromToken,
    allowCreate: true,
  });

  const accountData = accountDoc.data();
  if (!accountData) {
    throw new HttpsError(
      'internal',
      'Não foi possível recuperar os dados da conta bancária associada ao usuário.',
    );
  }

  const accountNumber = accountData.accountNumber as string | undefined;
  if (!accountNumber) {
    throw new HttpsError(
      'internal',
      'A conta bancária associada ao usuário está sem um número de conta válido.',
    );
  }

  const cardRef = db.collection('payment-cards').doc();

  const { cardNumber, maskedNumber, lastFourDigits } = await generateUniqueCardNumber(db);
  const timestamp = Timestamp.now();

  const defaults = getDefaultCardConfig(cardType as PaymentCardType);

  await cardRef.set({
    id: cardRef.id,
    accountId: accountDoc.id,
    accountNumber,
    uid: request.auth.uid,
    cardType,
    brand,
    label,
    cardNumber,
    maskedNumber,
    lastFourDigits,
    invoiceAmountInCents: 0,
    invoiceDueDate: defaults.invoiceDueDate,
    availableLimitInCents: defaults.availableLimitInCents,
    creditLimitInCents: defaults.creditLimitInCents,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const cardSnapshot = await cardRef.get();
  const card = mapPaymentCard(cardSnapshot);

  return {
    success: true,
    card,
    message: 'Cartão criado com sucesso.',
  };
});
