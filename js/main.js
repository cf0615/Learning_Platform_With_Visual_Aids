import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';


document.addEventListener("DOMContentLoaded", function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, allow access to the content
            console.log("User is logged in:", user);
            // You can display content or do other tasks here
        } else {
            // No user is signed in, redirect to login page
            console.log("No user is logged in, redirecting to login page.");
            window.location.href = "login.html";  // Redirect to login page
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const postTitle = document.getElementById('post-title').value;
    const submitButton = document.getElementById('submitPost');  // Grab the submit button
    const problemType = document.getElementById('problem-type').value;

     // Check if title is not empty
     if (postTitle.trim() === '') {
        alert('Title cannot be empty.');
        return;
    }

    // Check if the user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Add event listener for form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handlePostSubmit(user);
            });

            // Add click event listener to the submit button
            submitButton.addEventListener('click', async (e) => {
                e.preventDefault();  // Prevent default form submission
                await handlePostSubmit(user);
            });

        } else {
            // If user is not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Function to handle post submission
    async function handlePostSubmit(user) {
        // Get post data from the form
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const category = document.getElementById('post-category').value;

        try {
            // Add new post to Firestore
            await addDoc(collection(db, 'posts'), {
                authorPfp: user.photoURL || '',  // user profile photo URL
                authorName: user.username || user.email,  // username or email
                authorid: user.uid,  // user's unique ID
                title: title,
                plainText: content,
                category: category,
                vote: 0,  // initialize with 0 votes
                answered: false,  // initialize as unanswered
                timestamp: serverTimestamp(),
            });

            // Display success message
            messageDiv.textContent = "Post successfully added!";
            messageDiv.style.color = "green";

            // Clear form
            form.reset();
        } catch (error) {
            // Display error message
            messageDiv.textContent = "Error: " + error.message;
            messageDiv.style.color = "red";
        }
    }
});