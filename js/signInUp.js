import { auth, db } from './firebase-config.js'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function signUp(){
    const email = document.getElementById("email-su").value;
    const username = document.getElementById("username-su").value;
    const password = document.getElementById("password-su").value;
    
    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            //save user details
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                username: username,
                createdAt: new Date()
            });
            
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert("Error: " + errorMessage);
        });
}

function signIn(){
    const email = document.getElementById("email-si").value;
    const password = document.getElementById("password-si").value;

    if ((email == null || email == "") && (password == "" || password == null)){
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            //Signed in
            const user = userCredential.user;
            console.log("User signed in:", user);
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            console.error("Error signing in:", error.code, error.message);
            alert('Sign in failed: ${error.message}');
        });
}

//attach event listener when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function(){
    const signUpBtn = document.getElementById("signup-su");
    if (signUpBtn != null)
        signUpBtn.addEventListener("click", signUp);
    else
        return;
});

document.addEventListener("DOMContentLoaded", function(){
    const signInBtn = document.getElementById("login-si");
    if (signInBtn != null)
        signInBtn.addEventListener("click", signIn);
    else
        return;
});