import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { mapPaymentCardTransaction } from './paymentCardService';
import {
  GetPaymentCardTransactionsData,
  GetPaymentCardTransactionsResponse,
} from './types';

const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

export const getPaymentCardTransactions = onCall(
  async (request): Promise<GetPaymentCardTransactionsResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'A função deve ser chamada por um usuário autenticado.',
      );
    }

    const payload = request.data as GetPaymentCardTransactionsData | undefined;

    if (!payload || typeof payload.cardId !== 'string' || payload.cardId.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'O campo "cardId" é obrigatório.');
    }

    try {
      const limit = (() => {
        if (payload.limit == null) {
          return 20;
        }

        if (typeof payload.limit !== 'number' || !Number.isFinite(payload.limit)) {
          throw new HttpsError('invalid-argument', 'O campo "limit" deve ser um número.');
        }

        const normalized = Math.floor(payload.limit);
        if (normalized < MIN_LIMIT || normalized > MAX_LIMIT) {
          throw new HttpsError(
            'invalid-argument',
            `O campo "limit" deve estar entre ${MIN_LIMIT} e ${MAX_LIMIT}.`,
          );
        }
        return normalized;
      })();

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

      const transactionsQuery = db
        .collection('card-transactions')
        .where('cardId', '==', payload.cardId)
        .limit(limit);

      const transactionsSnapshot = await transactionsQuery.get();
      const transactions = transactionsSnapshot.docs
        .map((doc) => {
          try {
            return mapPaymentCardTransaction(doc);
          } catch (mappingError) {
            console.warn(
              `Falha ao normalizar transação do cartão (${payload.cardId}) - doc ${doc.id}:`,
              mappingError,
            );
            return null;
          }
        })
        .filter((transaction): transaction is ReturnType<typeof mapPaymentCardTransaction> => {
          return transaction !== null;
        });

      transactions.sort((left, right) => {
        const leftTimestamp = left.timestamp ? Date.parse(left.timestamp) : 0;
        const rightTimestamp = right.timestamp ? Date.parse(right.timestamp) : 0;
        return rightTimestamp - leftTimestamp;
      });

      return {
        success: true,
        transactions,
      };
    } catch (error: any) {
      console.error(
        'Erro ao obter transações do cartão:',
        JSON.stringify(
          {
            cardId: payload.cardId,
            uid: request.auth?.uid,
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

      throw new HttpsError(
        'internal',
        'Erro interno ao buscar as transações do cartão.',
        error?.message ?? error,
      );
    }
  },
);
