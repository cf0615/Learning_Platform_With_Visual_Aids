import { auth, db } from './firebase-config.js';
import { addDoc, collection, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function
import { showPopup } from './popup.js';

// Function to handle navigation with time saving
async function handleNavigation(event) {
    event.preventDefault();  // Prevent default link navigation

    const targetUrl = event.currentTarget.getAttribute('href');  // Get the URL from the clicked link
    
    // Call saveStudyTime function before navigating
    await saveStudyTime();  // Wait for the save operation to complete

    // After saving the study time, proceed with navigation
    window.location.href = targetUrl;
}

// Apply the event listener to all navigation links in the navbar and sidebar
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', handleNavigation);
});

// Initialize Quill editor with a placeholder
var quill = new Quill('#editor-container', {
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
        var postContent = quill.root.innerHTML;

        // Validate title
        if (postTitle.trim() === '') {
            showPopup({
                title: "Validation Error",
                message: "Post title cannot be empty.",
                type: "error"
            });
            return;
        }

        // Validate content (check if it's empty or just contains whitespace/HTML tags)
        const plainText = quill.getText().trim();
        if (plainText === '') {
            showPopup({
                title: "Validation Error",
                message: "Post content cannot be empty.",
                type: "error"
            });
            return;
        }

        // Show loading popup while submitting
        showPopup({
            title: "Submitting",
            message: "Please wait while we submit your post...",
            type: "loading"
        });

        // Get user data
        const userData = (await getDoc(doc(db, 'users', user.uid))).data();

        // Create the post object
        var post = {
            answered: false,
            authorName: userData.username || "Anonymous",
            authorPfp: userData.pfpUrl || "",
            authorid: user.uid,
            category: problemType,
            plainText: quill.getText(),
            formattedContent: postContent,
            timestamp: new Date().toUTCString(),
            title: postTitle,
            voteCount: 0
        };

        // Save post to Firestore
        await addDoc(collection(db, 'posts'), post);

        // Show success popup
        showPopup({
            title: "Success!",
            message: "Your post has been submitted successfully.",
            type: "success",
            onConfirm: () => {
                // Clear the form after submission
                document.getElementById('post-title').value = '';
                document.getElementById('problem-type').selectedIndex = 0;
                quill.setContents([]);
                
                // Redirect to discussion page
                window.location.href = '/user/discussion';
            }
        });

    } catch (error) {
        console.error("Error submitting post:", error);
        
        // Show error popup
        showPopup({
            title: "Error",
            message: error instanceof Error ? error.message : "An error occurred while submitting your post. Please try again.",
            type: "error"
        });
    }
}

// Add event listener to the submit button
document.getElementById('submitPost').addEventListener('click', async (event) => {
    event.preventDefault(); // Prevent form submission
    await submitPost();
});