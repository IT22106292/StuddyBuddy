import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

// Simple test function to check if rules are working
export const testRules = async () => {
  try {
    console.log("Testing Firestore rules...");
    
    // Try to update a test document
    const testDocRef = doc(db, "globalChat", "test-message");
    await updateDoc(testDocRef, {
      testField: "test-value"
    });
    
    console.log("Rules test passed - you have permission to update documents");
  } catch (error) {
    console.error("Rules test failed:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
  }
};