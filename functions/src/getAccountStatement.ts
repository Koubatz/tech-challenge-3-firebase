import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GetAccountStatementData, GetAccountStatementResponse, Transaction } from './types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/**
 * Busca o extrato (histórico de transações) de uma conta bancária.
 * A função é acionada via HTTPS e utiliza o usuário autenticado para localizar a conta.
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - transactions: Array de transações
 */
export const getAccountStatement = onCall(async (request): Promise<GetAccountStatementResponse> => {
  const data = request.data as GetAccountStatementData;

  // Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'A função deve ser chamada por um usuário autenticado.',
    );
  }
  const rawPage = data.page ?? DEFAULT_PAGE;
  const rawPageSize = data.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpsError(
      'invalid-argument',
      'O parâmetro page deve ser um inteiro maior ou igual a 1.',
    );
  }

  const pageSize = Number(rawPageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new HttpsError(
      'invalid-argument',
      `O parâmetro 'pageSize' deve ser um inteiro entre 1 e ${MAX_PAGE_SIZE}.`,
    );
  }

  const db = getFirestore();

  try {
    // 2. Garantir que existe uma conta vinculada ao usuário autenticado.
    const accountSnapshot = await db
      .collection('bank-accounts')
      .where('uid', '==', request.auth.uid)
      .limit(1)
      .get();

    if (accountSnapshot.empty) {
      throw new HttpsError('not-found', 'Nenhuma conta foi encontrada para o usuário autenticado.');
    }

    const accountData = accountSnapshot.docs[0].data();
    const accountNumber = accountData.accountNumber;

    if (data.accountNumber && data.accountNumber !== accountNumber) {
      throw new HttpsError(
        'permission-denied',
        'Você não tem permissão para consultar o extrato da conta informada.',
      );
    }

    // 3. Buscar as transações para o número da conta, ordenadas por data.
    const transactionsRef = db.collection('transactions');
    const query = transactionsRef
      .where('accountNumber', '==', accountNumber)
      .orderBy('timestamp', 'desc'); // Mais recentes primeiro

    const offset = (page - 1) * pageSize;
    // Busca uma página de resultados e um documento adicional para determinar se há próxima página.
    const snapshot = await query
      .offset(offset)
      .limit(pageSize + 1)
      .get();

    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    // 4. Mapear os documentos para o formato da resposta.
    const transactions: Transaction[] = docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        type: docData.type,
        amount: (docData.amountInCents || 0) / 100,
        // O timestamp do Firestore precisa ser convertido para uma string ISO.
        timestamp: docData.timestamp.toDate().toISOString(),
        newBalance: (docData.newBalanceInCents || 0) / 100,
      };
    });

    console.log(
      `Extrato para a conta ${accountNumber} consultado com sucesso. Página ${page}, pageSize ${pageSize}.`,
    );

    return {
      success: true,
      transactions,
      page,
      pageSize,
      hasMore,
    };
  } catch (error) {
    console.error('Erro ao buscar extrato da conta:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocorreu um erro interno ao buscar o extrato da conta.');
  }
});
