import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { executeTransaction } from './transactionService';
import { PerformTransactionData, PerformTransactionResponse, TransactionType } from './types';

/**
 * Realiza uma transação (depósito ou saque) em uma conta bancária.
 * A função é acionada via HTTPS e utiliza o usuário autenticado para localizar a conta.
 * Espera os seguintes parâmetros:
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
  const payload = request.data as PerformTransactionData & { accountNumber?: string };

  // 2. Validação dos dados de entrada.
  if (data.amount == null || !data.type) {
    throw new HttpsError('invalid-argument', 'A função deve ser chamada com amount e type.');
  }

  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount <= 0) {
    throw new HttpsError('invalid-argument', 'O valor (amount) deve ser um número positivo.');
  }

  if (data.type !== TransactionType.DEPOSIT && data.type !== TransactionType.WITHDRAWAL) {
    throw new HttpsError(
      'invalid-argument',
      'O tipo (type) da transação deve ser DEPOSIT ou WITHDRAWAL.',
    );
  }

  let customTimestamp: Date | undefined;
  if (data.timestamp != null) {
    if (typeof data.timestamp !== 'string' && typeof data.timestamp !== 'number') {
      throw new HttpsError(
        'invalid-argument',
        'O campo opcional timestamp deve ser uma string ISO 8601 ou um número representando a data.',
      );
    }

    const parsedTimestamp = new Date(data.timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      throw new HttpsError(
        'invalid-argument',
        'Não foi possível interpretar o valor informado em timestamp.',
      );
    }

    customTimestamp = parsedTimestamp;
  }

  let category: string | undefined;
  if (payload.category != null) {
    if (typeof payload.category !== 'string') {
      throw new HttpsError('invalid-argument', 'O campo opcional category deve ser uma string.');
    }
    const trimmedCategory = payload.category.trim();
    if (trimmedCategory.length === 0) {
      throw new HttpsError('invalid-argument', 'O campo category não pode ser vazio.');
    }
    if (trimmedCategory.length > 100) {
      throw new HttpsError(
        'invalid-argument',
        'O campo category deve ter no máximo 100 caracteres.',
      );
    }
    category = trimmedCategory;
  }

  const db = getFirestore();

  try {
    // 3. Buscar a conta vinculada ao usuário autenticado.
    const accountsRef = db.collection('bank-accounts');
    const accountSnapshot = await accountsRef.where('uid', '==', request.auth.uid).limit(1).get();

    if (accountSnapshot.empty) {
      throw new HttpsError('not-found', 'Nenhuma conta foi encontrada para o usuário autenticado.');
    }

    const accountDoc = accountSnapshot.docs[0];
    const accountData = accountDoc.data();
    const accountNumber = accountData.accountNumber;

    if (payload.accountNumber && payload.accountNumber !== accountNumber) {
      throw new HttpsError(
        'permission-denied',
        'Você não tem permissão para movimentar a conta informada.',
      );
    }

    const result = await executeTransaction(db, {
      accountNumber,
      amountInCents: data.amount,
      type: data.type,
      uid: request.auth.uid,
      timestamp: customTimestamp,
      category,
    });

    console.log(
      `${data.type} de ${data.amount} para a conta ${accountNumber} realizado com sucesso.`,
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
