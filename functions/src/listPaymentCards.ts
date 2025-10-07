import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ensureBankAccountForUser } from './accountService';
import { mapPaymentCard } from './paymentCardService';
import { ListPaymentCardsResponse } from './types';

export const listPaymentCards = onCall(async (request): Promise<ListPaymentCardsResponse> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'A função deve ser chamada por um usuário autenticado.',
    );
  }

  const db = getFirestore();

  try {
    const ownerNameFromToken =
      (request.auth.token?.name as string | undefined) ??
      (request.auth.token?.email as string | undefined) ??
      'Cliente';
    const rawEmail = request.auth.token?.email;
    const ownerEmailFromToken = typeof rawEmail === 'string' ? rawEmail : undefined;

    const { accountDoc } = await ensureBankAccountForUser(db, {
      uid: request.auth.uid,
      ownerName: ownerNameFromToken,
      ownerEmail: ownerEmailFromToken,
      allowCreate: true,
    });

    const cardsSnapshot = await db
      .collection('payment-cards')
      .where('accountId', '==', accountDoc.id)
      .get();

    const cards = cardsSnapshot.docs.map((doc) => mapPaymentCard(doc));

    cards.sort((left, right) => {
      const leftDate = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightDate = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightDate - leftDate;
    });

    return {
      success: true,
      cards,
    };
  } catch (error: any) {
    console.error(
      'Erro ao listar cartões:',
      JSON.stringify(
        {
          uid: request.auth.uid,
          message: error?.message,
          code: error?.code,
        },
        null,
        2,
      ),
    );

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'Erro interno ao listar cartões.', error?.message ?? error);
  }
});
