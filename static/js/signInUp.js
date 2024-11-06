import { auth, db, storage } from './firebase-config.js';
import { setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showPopup, hidePopup, showInputPopup } from './popup.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function to validate password strength
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passwordRegex.test(password);
}

function showErrorMessage(elementId, message) {
    document.getElementById(elementId).innerText = message;
}

function clearErrorMessage(elementId) {
    document.getElementById(elementId).innerText = '';
}

function validateFields() {
    const email = document.getElementById("email-su").value;
    const username = document.getElementById("username-su").value;
    const password = document.getElementById("password-su").value;
    const confirmPassword = document.getElementById("cpassword-su").value;

    let isValid = true;

    // Email validation
    if (!email) {
        showErrorMessage("email-error", "Email is required.");
        isValid = false;
    } else if (!isValidEmail(email)) {
        showErrorMessage("email-error", "Please enter a valid email address.");
        isValid = false;
    } else {
        clearErrorMessage("email-error");
    }

    // Username validation
    if (!username) {
        showErrorMessage("username-error", "Username is required.");
        isValid = false;
    } else {
        clearErrorMessage("username-error");
    }

    // Password validation
    if (!password) {
        showErrorMessage("password-error", "Password is required.");
        isValid = false;
    } else if (!isValidPassword(password)) {
        showErrorMessage("password-error", "Password must be at least 8 characters long, with 1 lowercase letter, 1 uppercase letter, 1 special character, and 1 number.");
        isValid = false;
    } else {
        clearErrorMessage("password-error");
    }

    // Confirm password validation
    if (!confirmPassword) {
        showErrorMessage("cpassword-error", "Please confirm your password.");
        isValid = false;
    } else if (confirmPassword !== password) {
        showErrorMessage("cpassword-error", "Passwords do not match.");
        isValid = false;
    } else {
        clearErrorMessage("cpassword-error");
    }

    return isValid;
}

async function signUp() {
    if (!validateFields()) {
        return;
    }

    const email = document.getElementById("email-su").value;
    const username = document.getElementById("username-su").value;
    const password = document.getElementById("password-su").value;
    const profilePicture = document.getElementById("profile-picture").files[0];

    showPopup({
        title: "Signing up...",
        type: "loading"
    });

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let profilePictureUrl = "";
        if (profilePicture) {
            const storageRef = ref(storage, `profile_pictures/${user.uid}`); // Reference to where the image will be stored
            await uploadBytes(storageRef, profilePicture); // Upload the file
            profilePictureUrl = await getDownloadURL(storageRef); // Get the file's URL
        }

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            username: username,
            pfpUrl: profilePictureUrl,
            role: 'user',
            createdAt: new Date()
        });

        hidePopup();
        showPopup({
            title: "Sign up successful!",
            message: "Please log in.",
            type: "success",
            onConfirm: () => window.location.href = '/'
        });
    } catch (error) {
        console.error("Error signing up:", error);
        hidePopup();

        let errorMessage;
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "The email address is already in use. Please use a different email.";
        } else {
            errorMessage = "An unexpected error occurred. Please try again.";
        }

        showPopup({
            title: "Sign Up Failed",
            message: errorMessage,
            type: "error",
            onConfirm: () => {}
        });
    }
}

function signIn() {
    const email = document.getElementById("email-si").value;
    const password = document.getElementById("password-si").value;

    if ((email == null || email == "") && (password == "" || password == null)) {
        showPopup({
            title: "Error",
            message: "Please enter your email and password.",
            type: "error"
        });
        return;
    }

    // Show loading popup
    showPopup({
        type: "loading",
        title: "Signing In",
        message: "Please wait..."
    });

    // Set persistence to ensure auth state is maintained across page reloads
    setPersistence(auth, browserSessionPersistence)
        .then(() => {
            // Now sign in
            return signInWithEmailAndPassword(auth, email, password);
        })
        .then((userCredential) => {
            const user = userCredential.user;
            return user.getIdToken();  // Get the ID token
        })
        .then((idToken) => {
            console.log("ID Token:", idToken);  // Log the ID token to debug

            // Send the ID token to the backend
            return fetch('/verify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken }),  // Send the token in the body
                credentials: 'include'  // Include credentials in fetch request
            });
        })
        .then(response => {
            console.log("Response Status:", response.status);  // Debug the response status
            return response.json();  // Convert to JSON
        })
        .then(data => {
            console.log("Response Data:", data);  // Log the response data

            // Hide loading popup before redirecting
            hidePopup();

            // Redirect based on user role
            if (data.role === 'admin') {
                window.location.href = '/admin/dashboard';  // Redirect to admin dashboard
            } else {
                window.location.href = '/user/dashboard';  // Redirect to user dashboard
            }
        })
        .catch((error) => {
            console.error("Error signing in:", error);

            // Hide loading popup and show custom error message
            hidePopup();

            // Custom error message based on error code
            let errorMessage;
            if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMessage = "Email or password is invalid. Please try again.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many unsuccessful attempts. Please try again later.";
            } else {
                errorMessage = "An unexpected error occurred. Please try again.";
            }

            // Show error popup
            showPopup({
                title: "Sign In Failed",
                message: errorMessage,
                type: "error",
                onConfirm: () => {}  // Close the popup on confirm
            });
        });
}
// Attach event listener when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    const signUpBtn = document.getElementById("signup-su");
    if (signUpBtn != null) {
        signUpBtn.addEventListener("click", signUp);
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const signInBtn = document.getElementById("login-si");
    
    if (signInBtn != null) {
        signInBtn.addEventListener("click", signIn);
    }
});

// Forgot Password function
function forgotPassword() {
    // Show input popup for email entry
    showInputPopup({
        title: "Reset Password",
        htmlContent: `<input type="email" id="reset-email-input" placeholder="Enter your email" style="width: 100%; padding: 10px; font-size: 1em;">`,
        onConfirm: () => {
            const email = document.getElementById("reset-email-input").value;

            // Validate email
            if (!isValidEmail(email)) {
                showPopup({
                    title: "Invalid Email",
                    message: "Please enter a valid email address.",
                    type: "error",
                    onConfirm: () => {}  // Close the popup on confirm
                });
                return;
            }

            // Show loading popup while sending email
            showPopup({
                type: "loading"
            });

            // Send the password reset email
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    // Hide the loading popup
                    hidePopup();

                    // Show success popup
                    showPopup({
                        title: "Email Sent",
                        message: "A password reset link has been sent to your email.",
                        type: "success",
                        onConfirm: () => {}  // Close popup on confirm
                    });
                })
                .catch((error) => {
                    // Hide the loading popup
                    hidePopup();

                    // Show error popup
                    showPopup({
                        title: "Error",
                        message: "Error: " + error.message,
                        type: "error",
                        onConfirm: () => {}  // Close popup on confirm
                    });
                });
        },
        showCancel: true
    });
}

document.getElementById("forgot-password-link").addEventListener("click", (e) => {
    e.preventDefault();  // Prevent default anchor behavior
    forgotPassword();
});

