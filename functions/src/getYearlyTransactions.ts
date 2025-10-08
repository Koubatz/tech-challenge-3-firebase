import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  GetYearlyTransactionsData,
  GetYearlyTransactionsResponse,
  MonthlyTransactions,
  Transaction,
} from './types';

const DEFAULT_YEAR = new Date().getUTCFullYear();
const MIN_YEAR = 1900;
const MAX_YEAR = 9999;

/**
 * Retorna todas as transações do usuário autenticado em um ano específico, agrupadas por mês.
 */
export const getYearlyTransactions = onCall(
  async (request): Promise<GetYearlyTransactionsResponse> => {
    const data = (request.data ?? {}) as GetYearlyTransactionsData;

    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'A função deve ser chamada por um usuário autenticado.',
      );
    }

    const uid = request.auth.uid;

    const rawYear = data.year ?? DEFAULT_YEAR;
    const year = Number(rawYear);
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new HttpsError(
        'invalid-argument',
        `O parâmetro 'year' deve ser um número inteiro entre ${MIN_YEAR} e ${MAX_YEAR}.`,
      );
    }

    const db = getFirestore();

    try {
      const accountSnapshot = await db
        .collection('bank-accounts')
        .where('uid', '==', uid)
        .limit(1)
        .get();

      if (accountSnapshot.empty) {
        throw new HttpsError(
          'not-found',
          'Nenhuma conta foi encontrada para o usuário autenticado.',
        );
      }

      const accountData = accountSnapshot.docs[0].data();
      const accountNumber = accountData.accountNumber;

      if (data.accountNumber && data.accountNumber !== accountNumber) {
        throw new HttpsError(
          'permission-denied',
          'Você não tem permissão para consultar a conta informada.',
        );
      }

      const startOfYear = Timestamp.fromDate(new Date(Date.UTC(year, 0, 1, 0, 0, 0)));
      const startOfNextYear = Timestamp.fromDate(new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)));

      const transactionsSnapshot = await db
        .collection('transactions')
        .where('accountNumber', '==', accountNumber)
        .where('timestamp', '>=', startOfYear)
        .where('timestamp', '<', startOfNextYear)
        .orderBy('timestamp', 'asc')
        .get();

      const transactionsByMonth = new Map<number, Transaction[]>();

      transactionsSnapshot.forEach((doc) => {
        const docData = doc.data();
        const firestoreTimestamp = docData.timestamp;

        if (!firestoreTimestamp || typeof firestoreTimestamp.toDate !== 'function') {
          return;
        }

        const transactionDate = firestoreTimestamp.toDate();
        const month = transactionDate.getUTCMonth() + 1; // 1-12

        const transaction: Transaction = {
          id: doc.id,
          type: docData.type,
          amount: docData.amountInCents || 0,
          timestamp: transactionDate.toISOString(),
          newBalance: docData.newBalanceInCents || 0,
          category: docData.category ?? null,
        };

        const monthTransactions = transactionsByMonth.get(month) ?? [];
        monthTransactions.push(transaction);
        transactionsByMonth.set(month, monthTransactions);
      });

      const months: MonthlyTransactions[] = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return {
          month,
          transactions: transactionsByMonth.get(month) ?? [],
        };
      });

      console.log(
        `Transações de ${year} para a conta ${accountNumber} consultadas com sucesso pelo usuário ${uid}.`,
      );

      return {
        success: true,
        year,
        months,
      };
    } catch (error) {
      console.error('Erro ao buscar transações do ano:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Ocorreu um erro interno ao buscar as transações do ano.');
    }
  },
);
