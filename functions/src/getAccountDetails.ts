import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GetAccountDetailsResponse } from './types';

/**
 * Busca os detalhes de uma conta bancária, incluindo o saldo.
 * A função é acionada via HTTPS e utiliza o usuário autenticado para localizar a conta.
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - accountNumber: string
 * - agency: string
 * - ownerName: string
 * - ownerEmail: string | null
 * - balance: number (saldo em formato decimal)
 */
export const getAccountDetails = onCall(async (request): Promise<GetAccountDetailsResponse> => {
  // Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'A função deve ser chamada por um usuário autenticado.',
    );
  }

  const uid = request.auth.uid;

  const db = getFirestore();

  try {
    // 1. Encontrar a conta bancária vinculada ao usuário autenticado.
    const accountsRef = db.collection('bank-accounts');
    const query = accountsRef.where('uid', '==', uid).limit(1);
    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new HttpsError('not-found', 'Nenhuma conta foi encontrada para o usuário autenticado.');
    }

    const accountDoc = snapshot.docs[0];
    const accountData = accountDoc.data();

    // 3. Preparar a resposta.
    // Converte o saldo de centavos para formato decimal.
    const balance = (accountData.balanceInCents || 0) / 100;

    const response: GetAccountDetailsResponse = {
      success: true,
      accountNumber: accountData.accountNumber,
      agency: accountData.agency,
      ownerName: accountData.ownerName,
      ownerEmail: typeof accountData.ownerEmail === 'string' ? accountData.ownerEmail : null,
      balance: balance,
    };

    console.log(
      `Consulta para a conta ${accountData.accountNumber} realizada com sucesso para o usuário ${uid}.`,
    );
    return response;
  } catch (error) {
    console.error('Erro ao buscar detalhes da conta:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocorreu um erro interno ao buscar os detalhes da conta.');
  }
});
