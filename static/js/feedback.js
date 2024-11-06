import { auth, db } from './firebase-config.js';
import { addDoc, collection, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { showPopup } from './popup.js';

// Initialize Quill editor
var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: '   Write your feedback here...',
    modules: {
        toolbar: '#toolbar-container',
        history: {
            delay: 1000,
            userOnly: true
        }
    }
});

// Undo and Redo functionality
document.getElementById('undo').addEventListener('click', function() {
    quill.history.undo();
});

document.getElementById('redo').addEventListener('click', function() {
    quill.history.redo();
});

// Check user authentication status
async function checkUserAndSubmit() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user);
            } else {
                reject('Authentication required');
            }
        });
    });
}

// Submit feedback logic
async function submitFeedback() {
    try {
        const user = await checkUserAndSubmit();
        const feedbackTitle = document.getElementById('feedback-title').value;
        const feedbackContent = quill.getText().trim();

        // Check if title is empty
        if (feedbackTitle.trim() === '') {
            showPopup({
                title: "Validation Error",
                message: "Feedback title cannot be empty.",
                type: "error",
                showCancel: false
            });
            return;
        }

        // Check if content is empty
        if (feedbackContent === '') {
            showPopup({
                title: "Validation Error",
                message: "Feedback content cannot be empty.",
                type: "error",
                showCancel: false
            });
            return;
        }

        // Show loading popup
        showPopup({
            title: "Submitting",
            message: "Please wait while we submit your feedback...",
            type: "loading"
        });

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        // Create the feedback object with proper field mapping
        const feedback = {
            authorName: userData.username || user.email, // Fallback to email if username not found
            authorEmail: user.email,
            authorPfp: userData.pfpUrl || "../static/img/default-user.jpg", // Use default image if no profile picture
            authorId: user.uid,
            plainText: quill.getText().trim(),
            formattedContent: quill.root.innerHTML,
            timestamp: new Date().toISOString(),
            title: feedbackTitle,
            replied: false  // Add this field
        };

        console.log("Submitting feedback:", feedback); // Debug log

        // Save feedback to Firestore
        await addDoc(collection(db, 'feedback'), feedback);

        // Show success popup and clear form on confirmation
        showPopup({
            title: "Success",
            message: "Your feedback has been submitted successfully!",
            type: "success",
            showCancel: false,
            onConfirm: () => {
                // Clear the form after successful submission
                document.getElementById('feedback-title').value = '';
                quill.setContents([]);
            }
        });

    } catch (error) {
        console.error("Error submitting feedback:", error);
        
        // Show appropriate error message based on the error type
        if (error === 'Authentication required') {
            showPopup({
                title: "Authentication Required",
                message: "You must be logged in to submit feedback.",
                type: "error",
                showCancel: false
            });
        } else {
            showPopup({
                title: "Error",
                message: "Failed to submit feedback. Please try again.",
                type: "error",
                showCancel: false
            });
        }
    }
}

// Add event listener to the submit button
document.getElementById('submitPost').addEventListener('click', async () => {
    await submitFeedback();
});