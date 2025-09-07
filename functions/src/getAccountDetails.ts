import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { GetAccountDetailsData, GetAccountDetailsResponse } from "./types";

/**
 * Busca os detalhes de uma conta bancária, incluindo o saldo.
 * A função é acionada via HTTPS e espera o seguinte parâmetro:
 * - accountNumber: string (número da conta a ser consultada)
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - accountNumber: string
 * - agency: string
 * - ownerName: string
 * - balance: number (saldo em formato decimal)
 */
export const getAccountDetails = onCall(async (request): Promise<GetAccountDetailsResponse> => {
  const data = request.data as GetAccountDetailsData;

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
    // 2. Encontrar a conta bancária pelo número da conta.
    const accountsRef = db.collection("bank-accounts");
    const query = accountsRef.where("accountNumber", "==", data.accountNumber).limit(1);
    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new HttpsError("not-found", `A conta ${data.accountNumber} não foi encontrada.`);
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
      balance: balance,
    };

    console.log(`Consulta para a conta ${data.accountNumber} realizada com sucesso.`);
    return response;
  } catch (error) {
    console.error("Erro ao buscar detalhes da conta:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Ocorreu um erro interno ao buscar os detalhes da conta.");
  }
});
