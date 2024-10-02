// Import the Firebase scripts
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

//Get the db instance
const db = getFirestore(app);

export { auth }; // Export the auth object to use in other scripts
export { db }; //Export the db object to use in other scripts