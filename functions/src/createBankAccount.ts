import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateAccountData, CreateAccountResponse } from "./types";

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
      "unauthenticated",
      "A função deve ser chamada por um usuário autenticado.",
    );
  }

  // 2. Validação dos dados de entrada.
  if (!data.ownerName) {
    throw new HttpsError(
      "invalid-argument",
      "A função deve ser chamada com o seguinte argumento: 'ownerName'.",
    );
  }

  try {
    // 3. Obter o próximo número da conta de forma atômica usando uma transação.
    const db = getFirestore();
    const counterRef = db.collection("counters").doc("bank-account-counter");
    const newNumber = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentNumber = counterDoc.data()?.currentNumber || 0;
      const nextNumber = currentNumber + 1;
      transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });
      return nextNumber;
    });

    // 4. Formatar o número da conta com preenchimento e dígito verificador.
    const baseNumberStr = String(newNumber).padStart(6, "0");
    const checkDigit = calculateCheckDigit(baseNumberStr);
    const fullAccountNumber = `${baseNumberStr}-${checkDigit}`;

    // É uma boa prática armazenar valores monetários como inteiros (centavos)
    // para evitar problemas de precisão com ponto flutuante.
    const balanceInCents = 0;

    // 5. Criar o novo documento da conta bancária.
    const writeResult = await db.collection("bank-accounts").add({
      accountNumber: fullAccountNumber,
      agency: "0001", // Agência fixa para o banco virtual.
      balanceInCents: balanceInCents,
      ownerName: data.ownerName,
      createdAt: new Date().toISOString(),
      uid: request.auth.uid,
    });

    console.log(
      `Conta bancária ${fullAccountNumber} criada com sucesso com o ID: ${writeResult.id}`,
    );

    // 6. Retornar uma resposta de sucesso com os dados gerados.
    const response: CreateAccountResponse = {
      success: true,
      docId: writeResult.id,
      accountNumber: fullAccountNumber,
    };

    return response;
  } catch (error) {
    console.error("Erro ao criar conta bancária:", error);
    throw new HttpsError("internal", "Ocorreu um erro interno ao criar a conta bancária.");
  }
});

/**
 * Calcula o dígito verificador de um número usando o algoritmo Módulo 11.
 * @param baseNumber O número base como uma string.
 * @returns O dígito verificador como uma string.
 */
function calculateCheckDigit(baseNumber: string): string {
  const sum = multipleDigitsPerWeight(baseNumber);
  const validatorDigit = sumPerModule11(sum);

  // Se o resultado for 10 ou 11, o dígito verificador é 0.
  if (validatorDigit === 10 || validatorDigit >= 10) {
    return "0";
  }

  return String(validatorDigit);
}

function multipleDigitsPerWeight(baseNumber: string): number {
  let sum = 0;
  let weight = 2;

  // Multiplica cada dígito pelo seu peso, da direita para a esquerda.
  for (let i = baseNumber.length - 1; i >= 0; i--) {
    sum += parseInt(baseNumber.charAt(i), 10) * weight;
    // O peso vai de 2 a 7 e depois volta para 2.
    if (weight < 7) {
      weight++;
    } else {
      weight = 2;
    }
  }

  return sum;
}

function sumPerModule11(sum: number): number {
  const remainder = sum % 11;
  return 11 - remainder;
}
