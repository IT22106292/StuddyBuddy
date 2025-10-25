// Script to clean up invalid profile image URLs from the database
// Run this script to remove all blob:, file://, and local paths from user profiles

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

async function cleanupInvalidProfileImageUrls() {
  try {
    console.log("Starting cleanup of invalid profile image URLs...");
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let updateCount = 0;
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Check if profileImage is an invalid URL
      if (userData.profileImage && 
          (userData.profileImage.startsWith('blob:') || 
           userData.profileImage.startsWith('file://') ||
           userData.profileImage.startsWith('/'))) {
        
        console.log(`Found invalid URL for user ${userDoc.id}:`, userData.profileImage);
        
        // Remove the invalid URL
        await updateDoc(doc(db, "users", userDoc.id), { profileImage: null });
        console.log(`Removed invalid URL for user ${userDoc.id}`);
        updateCount++;
      }
    }
    
    console.log(`Cleanup completed. Removed ${updateCount} invalid URLs.`);
    
    if (updateCount > 0) {
      console.log("Users with removed URLs will need to re-upload their profile images.");
    } else {
      console.log("No invalid URLs found.");
    }
    
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Run the cleanup function
cleanupInvalidProfileImageUrls();