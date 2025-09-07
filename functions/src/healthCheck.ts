import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Função de verificação de integridade (health check).
 * Esta função tenta escrever um documento simples no Firestore
 * para garantir que a conexão com o banco de dados está funcionando.
 * A função é acionada via HTTPS e não espera parâmetros.
 *
 * A função retorna um objeto com os seguintes campos em caso de sucesso:
 * - success: boolean
 * - docId: string (ID do documento criado no Firestore)
 *
 * Em caso de falha, retorna:
 * - success: boolean
 * - error: string (mensagem de erro genérica)
 */
export const healthCheck = onCall(async (request: CallableRequest<unknown>) => {
  try {
    // Get a reference to the Firestore database.
    const db = getFirestore();

    // Add a new document with a server-generated timestamp
    // to the 'health-checks' collection.
    const writeResult = await db.collection("health-checks").add({
      timestamp: FieldValue.serverTimestamp(),
      // Optional: include user info if the function
      // is called by an authenticated user.
      uid: request.auth ? request.auth.uid : "anonymous",
    });

    const docId = writeResult.id;
    console.log(`Successfully wrote to Firestore with doc ID: ${docId}`);

    // Return a success response with the new document's ID.
    return { success: true, docId };
  } catch (error) {
    // It's good practice to not expose detailed internal errors to the client.
    // The detailed error will be available in your Firebase Function logs.
    return { success: false, error: "An internal error occurred." };
  }
});
