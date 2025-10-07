import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ensureBankAccountForUser } from './accountService';
import { CreateAccountData, CreateAccountResponse } from './types';

/**
 * Função Cloud Function para criar uma nova conta bancária.
 * A função é acionada via HTTPS e espera o seguinte parâmetro:
 * - ownerName: string (nome do titular da conta)
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - docId: string (ID do documento criado no Firestore)
 * - accountNumber: string (número completo da conta, incluindo dígito verificador)
 *
 * Em caso de erro, a função lança um HttpsError com o código apropriado.
 */

export const createBankAccount = onCall(async (request) => {
  const data = request.data as CreateAccountData;

  // 1. Verificação de Autenticação.
  // Se request.auth for nulo, o usuário não está autenticado.
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'A função deve ser chamada por um usuário autenticado.',
    );
  }

  // 2. Validação dos dados de entrada.
  if (!data.ownerName) {
    throw new HttpsError(
      'invalid-argument',
      'A função deve ser chamada com o seguinte argumento: ownerName.',
    );
  }

  try {
    const db = getFirestore();
    const { accountDoc, created } = await ensureBankAccountForUser(db, {
      uid: request.auth.uid,
      ownerName: data.ownerName,
      allowCreate: true,
    });

    const accountData = accountDoc.data();
    if (!accountData) {
      throw new HttpsError(
        'internal',
        'Não foi possível recuperar os dados da conta bancária recém-criada.',
      );
    }

    if (created) {
      console.log(
        `Conta bancária ${accountData.accountNumber} criada com sucesso com o ID: ${accountDoc.id}`,
      );
    } else {
      console.log(
        `Conta bancária ${accountData.accountNumber} já existia para o usuário ${request.auth.uid}.`,
      );
    }

    const response: CreateAccountResponse = {
      success: true,
      docId: accountDoc.id,
      accountNumber: accountData.accountNumber,
    };

    return response;
  } catch (error) {
    console.error('Erro ao criar conta bancária:', error);
    throw new HttpsError('internal', 'Ocorreu um erro interno ao criar a conta bancária.');
  }
});
