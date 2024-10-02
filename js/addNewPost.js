import { auth, db } from './firebase-config.js';
import { addDoc, collection, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, allow access to the content
            console.log("User is logged in:", user);
            
        } else {
            // No user is signed in, redirect to login page
            console.log("No user is logged in, redirecting to login page.");
            window.location.href = "login.html";  // Redirect to login page
        }
    });
});

// Initialize Quill editor with a placeholder
var quill = new quill('#editor-container', {
    theme: 'snow',
    placeholder: '   Write your post here...',
    modules: {
        toolbar: '#toolbar-container',
        history: { // Enable undo/redo functionality
            delay: 1000,
            userOnly: true
        }
    }
});

// Undo and Redo functionality using Quill's history module
document.getElementById('undo').addEventListener('click', function() {
    quill.history.undo();
});

document.getElementById('redo').addEventListener('click', function() {
    quill.history.redo();
});

// Check user authentication status before submitting a post
async function checkUserAndSubmit() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in
                resolve(user);
            } else {
                // User is not logged in, prevent post submission
                reject('You must be logged in to submit a post.');
            }
        });
    });
}

// Submit post logic
async function submitPost() {
    try {
        const user = await checkUserAndSubmit();

        var postTitle = document.getElementById('post-title').value;
        var problemType = document.getElementById('problem-type').value;

        // Check if title is not empty
        if (postTitle.trim() === '') {
            alert('Title cannot be empty.');
            return;
        }

        // Quill content extraction
        var postPlainText = quill.getText();  // plain text version
        var postFormattedContent = quill.root.innerHTML;  // HTML content with styles
        const userData = (await getDoc(doc(db, 'users', user.uid))).data();

        // Create the post object
        var post = {
            answered: false,
            authorName: userData.username || "Anonymous",
            authorPfp: userData.photoURL || "",  // Placeholder for profile picture URL
            authorid: user.uid,  // Firebase user ID
            category: problemType,
            plainText: postPlainText,
            formattedContent: postFormattedContent,  // The HTML content with styles
            timestamp: new Date().toUTCString(),  // Current timestamp
            title: postTitle,
            voteCount: 0
        };

        // Save post to Firestore using addDoc (which automatically generates the document ID)
        await addDoc(collection(db, 'posts'), post);

        console.log("Post added successfully!");

        // Clear the form after submission
        document.getElementById('post-title').value = '';
        document.getElementById('problem-type').selectedIndex = 0;
        quill.setContents([]);

    } catch (error) {
        console.error("Error submitting post:", error);
        alert(error);
    }
}

// Add event listener to the submit button
document.getElementById('submitPost').addEventListener('click', async () => {
    await submitPost();
});