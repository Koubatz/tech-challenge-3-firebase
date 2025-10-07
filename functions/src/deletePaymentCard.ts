import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DeletePaymentCardData, DeletePaymentCardResponse } from './types';

export const deletePaymentCard = onCall(
  async (request): Promise<DeletePaymentCardResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }

    const payload = request.data as DeletePaymentCardData | undefined;

    if (!payload || typeof payload.cardId !== 'string' || payload.cardId.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'O campo "cardId" é obrigatório.');
    }

    const db = getFirestore();
    const cardRef = db.collection('payment-cards').doc(payload.cardId);
    const cardSnapshot = await cardRef.get();

    if (!cardSnapshot.exists) {
      throw new HttpsError('not-found', 'O cartão informado não foi encontrado.');
    }

    const cardData = cardSnapshot.data();
    if (!cardData || cardData.uid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Você não tem acesso a este cartão.');
    }

    const transactionsSnapshot = await db
      .collection('card-transactions')
      .where('cardId', '==', payload.cardId)
      .get();

    const batch = db.batch();
    batch.delete(cardRef);

    transactionsSnapshot.docs.forEach((transactionDoc) => {
      batch.delete(transactionDoc.ref);
    });

    await batch.commit();

    return {
      success: true,
      removedTransactions: transactionsSnapshot.size,
    };
  },
);
