// Import the Firebase scripts
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js"; // Import Firebase Storage

// Your Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyCm_OK_3XUBWs8yb3ZumLxfaMXcLID6CYo",
    authDomain: "vizfb-63810.firebaseapp.com",
    projectId: "vizfb-63810",
    storageBucket: "vizfb-63810.appspot.com",
    messagingSenderId: "193882104184",
    appId: "1:193882104184:web:2c4eab8076570bfefe288d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get the Auth instance
const auth = getAuth(app);

// Get the Firestore instance
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app); // Initialize Storage

// Export the initialized instances
export { auth, db, storage };
