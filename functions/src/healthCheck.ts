import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

/**
 * Função de verificação de integridade (health check) para usuários autenticados.
 *
 * Esta função verifica a conectividade com o Firestore escrevendo um
 * documento na coleção 'health-checks'. Requer que o usuário esteja autenticado.
 *
 * @returns Uma promessa que resolve com um objeto contendo o status de sucesso
 *   e o ID do documento criado.
 * @throws {HttpsError} Lança um erro com código 'unauthenticated' se o usuário
 *   não estiver logado, ou 'internal' para outras falhas de banco de dados.
 */
export const healthCheck = onCall(async (request) => {
  // Garante que o usuário está autenticado.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'A função requer autenticação.');
  }

  const db = getFirestore();

  // Adiciona um novo documento com o UID do usuário e um timestamp.
  const writeResult = await db.collection('health-checks').add({
    uid: request.auth.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  console.log(
    `Health check bem-sucedido para o usuário ${request.auth.uid}. Doc ID: ${writeResult.id}`,
  );

  // Retorna sucesso. Erros internos são capturados automaticamente pelo Firebase.
  return { success: true, docId: writeResult.id };
});
