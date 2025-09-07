import { FieldValue, Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Detalhes necessários para executar uma transação.
 */
export interface TransactionDetails {
  accountNumber: string;
  amountInCents: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  uid: string;
}

/**
 * Executa uma transação de depósito ou saque de forma atômica no Firestore.
 * @param db A instância do Firestore.
 * @param details Os detalhes da transação a ser executada.
 * @returns Um objeto com o ID da transação e o novo saldo.
 */
export async function executeTransaction(db: Firestore, details: TransactionDetails) {
  const { accountNumber, amountInCents, type, uid } = details;
  const transactionRef = db.collection("transactions").doc();

  const newBalance = await db.runTransaction(async (t) => {
    // 1. Encontrar a conta bancária pelo número da conta.
    const accountsRef = db.collection("bank-accounts");
    const query = accountsRef.where("accountNumber", "==", accountNumber).limit(1);
    const snapshot = await t.get(query);

    if (snapshot.empty) {
      throw new HttpsError("not-found", `A conta ${accountNumber} não foi encontrada.`);
    }

    const accountDoc = snapshot.docs[0];
    const accountData = accountDoc.data();
    const currentBalanceInCents = accountData.balanceInCents || 0;
    let newBalanceInCents: number;

    // 2. Calcular novo saldo e verificar fundos para saque.
    if (type === "DEPOSIT") {
      newBalanceInCents = currentBalanceInCents + amountInCents;
    } else {
      // WITHDRAWAL
      if (currentBalanceInCents < amountInCents) {
        throw new HttpsError("failed-precondition", "Saldo insuficiente para realizar o saque.");
      }
      newBalanceInCents = currentBalanceInCents - amountInCents;
    }

    // 3. Atualizar o saldo da conta.
    t.update(accountDoc.ref, { balanceInCents: newBalanceInCents });

    // 4. Registrar a transação.
    t.set(transactionRef, {
      type: type,
      amountInCents: amountInCents,
      accountNumber: accountNumber,
      accountId: accountDoc.id,
      timestamp: FieldValue.serverTimestamp(),
      newBalanceInCents: newBalanceInCents,
      uid: uid,
    });

    return newBalanceInCents / 100; // Retorna o saldo em formato decimal.
  });

  return {
    transactionId: transactionRef.id,
    newBalance: newBalance,
  };
}
