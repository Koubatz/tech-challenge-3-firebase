import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { executeTransaction } from './transactionService';
import { PerformTransactionData, PerformTransactionResponse, TransactionType } from './types';

/**
 * Realiza uma transação (depósito ou saque) em uma conta bancária.
 * A função é acionada via HTTPS e espera os seguintes parâmetros:
 * - accountNumber: string (número da conta)
 * - amount: number (valor da transação)
 * - type: "DEPOSIT" | "WITHDRAWAL" (tipo da transação)
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - transactionId: string (ID da transação gerada)
 * - newBalance: number (novo saldo da conta em formato decimal)
 */
export const performTransaction = onCall(async (request): Promise<PerformTransactionResponse> => {
  // 1. Verificação de Autenticação.
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'A função deve ser chamada por um usuário autenticado.',
    );
  }

  const data = request.data as PerformTransactionData;

  // 2. Validação dos dados de entrada.
  if (!data.accountNumber || data.amount == null || !data.type) {
    throw new HttpsError(
      'invalid-argument',
      'A função deve ser chamada com \'accountNumber\', \'amount\' e \'type\'.',
    );
  }

  if (typeof data.amount !== 'number' || data.amount <= 0) {
    throw new HttpsError('invalid-argument', 'O valor (\'amount\') deve ser um número positivo.');
  }

  if (data.type !== TransactionType.DEPOSIT && data.type !== TransactionType.WITHDRAWAL) {
    throw new HttpsError(
      'invalid-argument',
      'O tipo (\'type\') da transação deve ser \'DEPOSIT\' ou \'WITHDRAWAL\'.',
    );
  }

  // Para evitar problemas com ponto flutuante, trabalhamos com centavos (inteiros).
  const amountInCents = Math.round(data.amount * 100);
  const db = getFirestore();

  try {
    const result = await executeTransaction(db, {
      accountNumber: data.accountNumber,
      amountInCents: amountInCents,
      type: data.type,
      uid: request.auth.uid,
    });

    console.log(
      `${data.type} de ${data.amount} para a conta ${data.accountNumber} realizado com sucesso.`,
    );

    return {
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance,
    };
  } catch (error) {
    console.error(`Erro ao realizar ${data.type}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocorreu um erro interno ao processar a transação.');
  }
});
