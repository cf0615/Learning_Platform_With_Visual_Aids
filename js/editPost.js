import { auth, db } from './firebase-config.js';
import { updateDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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

document.addEventListener("DOMContentLoaded", async function() {
    const postData = await getPostData();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, allow access to the content
            console.log("User is logged in:", user);
            //to prevent unauthorized access
            if (user.uid == postData.authorid){
                //user is the author, allow to edit
                console.log("User is the author");
            } else {
                //user is not author, redirect to discussion
                window.location.href = "discussion.html";
            }
        } else {
            // No user is signed in, redirect to login page
            console.log("No user is logged in, redirecting to login page.");
            window.location.href = "login.html";  // Redirect to login page
        }
    });
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
        window.location.href = `post-details.html?id=${postId}`; // Redirect back to post details page after save

    } catch (error) {
        console.error("Error updating post:", error);
        alert("Failed to update the post. Please try again.");
    }
}

document.getElementById("editPost").addEventListener('click', async()=>{
    await editPost();
});