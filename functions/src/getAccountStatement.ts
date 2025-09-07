import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { GetAccountStatementData, GetAccountStatementResponse, Transaction } from "./types";

/**
 * Busca o extrato (histórico de transações) de uma conta bancária.
 * A função é acionada via HTTPS e espera o seguinte parâmetro:
 * - accountNumber: string (número da conta a ser consultada)
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
      "unauthenticated",
      "A função deve ser chamada por um usuário autenticado.",
    );
  }

  // 1. Validação dos dados de entrada.
  if (!data.accountNumber) {
    throw new HttpsError("invalid-argument", "A função deve ser chamada com 'accountNumber'.");
  }

  const db = getFirestore();

  try {
    // 2. Buscar as transações para o número da conta, ordenadas por data.
    const transactionsRef = db.collection("transactions");
    const query = transactionsRef
      .where("accountNumber", "==", data.accountNumber)
      .orderBy("timestamp", "desc"); // Mais recentes primeiro

    const snapshot = await query.get();

    if (snapshot.empty) {
      // Retorna uma lista vazia se não houver transações, o que não é um erro.
      return {
        success: true,
        transactions: [],
      };
    }

    // 3. Mapear os documentos para o formato da resposta.
    const transactions: Transaction[] = snapshot.docs.map((doc) => {
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

    console.log(`Extrato para a conta ${data.accountNumber} consultado com sucesso.`);

    return {
      success: true,
      transactions: transactions,
    };
  } catch (error) {
    console.error("Erro ao buscar extrato da conta:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Ocorreu um erro interno ao buscar o extrato da conta.");
  }
});
