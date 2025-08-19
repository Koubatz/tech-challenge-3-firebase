import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions";
import {onCall, type CallableRequest} from "firebase-functions/v2/https";

setGlobalOptions({maxInstances: 10});

// Initialize Firebase Admin SDK.
// This is required for the function to have permission to write to Firestore.
initializeApp();
exports.healthCheck = onCall(async (request: CallableRequest<unknown>) => {
  console.log("Health check called, writing to Firestore.");

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
    return {success: true, docId};
  } catch (error) {
    console.error("Error writing to Firestore:", error);

    // It's good practice to not expose detailed internal errors to the client.
    // The detailed error will be available in your Firebase Function logs.
    return {success: false, error: "An internal error occurred."};
  }
});
