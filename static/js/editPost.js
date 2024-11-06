import { auth, db } from './firebase-config.js';
import { updateDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function

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

// Function to get post ID from URL
function getPostIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    console.log("Post ID from URL:", postId);  // Log the post ID for debugging
    return postId;
}

const postID = getPostIdFromURL();

async function getPostData(){
    if (!postID){
        console.error("Post ID is missing from the URL!");
        return;
    }

    try {
        const postRef = doc(db, 'posts', postID);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()){
            return postDoc.data();
        }
    } catch (error) {
        console.error("Error fetching post:", error);
    }

}

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

async function fetchOriginalPost(){
    const postData = await getPostData();  // fetches the post data from Firebase

    // Populate title input
    let titleInput = document.getElementById("post-title");
    titleInput.value = postData.title;  // Set the value of the input to the fetched title

    // Populate category dropdown
    let categoryDropdown = document.getElementById("problem-type");
    categoryDropdown.value = postData.category;  // Set the dropdown to the fetched category

    // Populate the post content (for rich text editors like Quill)
    let postContentEditor = quill.root; 
    postContentEditor.innerHTML = postData.formattedContent;  // Set the content
}

fetchOriginalPost();

// Function to save the edited post to Firestore
async function editPost() {
    const postId = getPostIdFromURL(); // retrieves the post ID from the URL
    const postRef = doc(db, 'posts', postId); // Reference to the post document in Firestore

    // Get updated values from the form
    const updatedTitle = document.getElementById("post-title").value;
    const updatedCategory = document.getElementById("problem-type").value;
    
    // Assuming you are using Quill.js for rich text content
    const updatedContent = quill.root.innerHTML; // Get updated HTML content
    const plainTextContent = quill.getText(); // Get plain text content

    if (!updatedTitle.trim()){
        alert("The title cannot be empty");
        return;
    }

    if (!plainTextContent.trim()){
        alert("The content cannot be empty");
        return;
    }

    try {
        // Update the post document in Firestore
        await updateDoc(postRef, {
            title: updatedTitle,
            category: updatedCategory,
            formattedContent: updatedContent, // Save the updated rich text HTML content
            plainText: plainTextContent, // Save the plain text content as well
            lastEditTimestamp: new Date().toUTCString() // Update the last edit timestamp to the current time
        });

        // Notify the user of successful update
        console.log("Post successfully updated!");
        alert("Post updated successfully!");
        window.location.href = `/user/post-details?id=${postId}`; // Redirect back to post details page after save

    } catch (error) {
        console.error("Error updating post:", error);
        alert("Failed to update the post. Please try again.");
    }
}

document.getElementById("editPost").addEventListener('click', async()=>{
    await editPost();
});