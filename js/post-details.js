import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, deleteDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";


let userId = null;
let userName = null;
const voteUp = document.getElementById('upvote-btn');
const voteDown = document.getElementById('downvote-btn');

document.addEventListener("DOMContentLoaded", function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, allow access to the content
            console.log("User is logged in:", user);
            userId = user.uid;
            userName = user.username;
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

// Function to get post ID from URL
function getPostIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    console.log("Post ID from URL:", postId);  // Log the post ID for debugging
    return postId;
}

let postId = null;
postId = getPostIdFromURL();

// Fetch and display the post content
// Fetch and display the post content
async function fetchAndDisplayPost() {
    const postId = getPostIdFromURL();

    if (!postId) {
        console.error("Post ID is missing from the URL!");
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
            const post = postDoc.data();
            const postContent = document.getElementById('post-content');
            const postTitle = document.getElementById('post-title');
            const postMeta = document.getElementById('post-meta');
            const postVoteCount = document.getElementById('vote-count');
            const authorDropdown = document.getElementById('author-dropdown');

            // Log post data for debugging
            console.log("Post data:", post);

            // Set the title, author, and date
            postTitle.textContent = post.title;
            postMeta.innerHTML = `Posted by <b>${post.authorName}</b> • ${new Date(post.timestamp).toLocaleDateString()}`;

            // Render post content from the HTML stored in formattedContent
            postContent.innerHTML = post.formattedContent;
                
            postVoteCount.textContent = post.voteCount;

            // Check if the current user is the author
            
            const currentUser = auth.currentUser;
            
            // if (currentUser && currentUser.uid === post.authorid) {
            //     // Show the dropdown menu if the user is the author
            //     authorDropdown.style.display = 'block';

            //     // Add event listeners for edit and delete options
            //     document.getElementById('edit-post').addEventListener('click', () => editPost(postId));
            //     document.getElementById('delete-post').addEventListener('click', () => deletePost(postId));
            // }

            //check if the current user has vote the post
            const vote = post.votes || {};
            const userVote = vote[currentUser.uid];

            if (userVote == 1){
                //user upvoted
                voteUp.classList.toggle('active');
            } else if (userVote == -1){
                //user downvoted
                voteDown.classList.toggle('active');
            } 

            // Fetch and display comments for the post
            await fetchAndDisplayComments(postId);
        } else {
            console.error("No such post found!");
            document.getElementById('post-content').innerHTML = "Post not found.";
        }
    } catch (error) {
        console.error("Error fetching post:", error);
        document.getElementById('post-content').innerHTML = "Error loading post.";
    }
}


// Function to fetch and display comments
async function fetchAndDisplayComments(postId) {
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = ""; // Clear previous comments

    const commentsRef = collection(db, 'comments', postId, 'msgId');
    
    try {
        const querySnapshot = await getDocs(commentsRef);

        if (querySnapshot.empty) {
            commentsContainer.innerHTML = "<p>No comments yet.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const commentData = doc.data();

            // Convert Firestore Timestamp to JavaScript Date
            const commentDate = commentData.timestamp ? commentData.timestamp.toDate() : new Date();
            const formattedDate = commentDate.toLocaleDateString();

            // Create comment HTML
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            commentElement.innerHTML = `
                <div class="comment-author">
                    <img src="${commentData.authorPfp || 'default-avatar.png'}" alt="Profile Picture">
                    <span>${commentData.authorName}</span>
                    <span class="comment-date">${formattedDate}</span>
                </div>
                <div class="comment-body">
                    ${commentData.formattedText}
                </div>
            `;

            commentsContainer.appendChild(commentElement);
        });

    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

fetchAndDisplayComments(postId);


// Add a comment to a post
async function addComment(postId, commentPlainText, commentFormmattedText) {
    const user = auth.currentUser; // Ensure the user is logged in
    if (!user) {
        console.error("User must be logged in to comment");
        return;
    }

    const authorPfp = user.photoURL || '';
    const authorName = user.displayName || user.email;
    const authorId = user.uid;
    const timestamp = new Date();
    const vote = 0;
    
    // Reference to the comments collection and specific post ID
    const postCommentRef = doc(db, 'comments', postId); // Comments collection by postId
    const commentId = doc(collection(postCommentRef, 'msgId')); // Subcollection for comments by msgId

    try {
        // Add the comment to the subcollection under the postId
        await setDoc(commentId, {
            authorPfp,
            authorName,
            authorId,
            plainText: commentPlainText,
            formattedText: commentFormattedText,
            timestamp,
            vote
        });

        console.log("Comment added successfully!");
    } catch (error) {
        console.error("Error adding comment:", error);
    }
}

// Call this function when submit button is clicked
document.getElementById('submit-comment-btn').addEventListener('click', () => {
    const postId = getPostIdFromURL();
    // Quill content extraction
    var commentPlainText = quill.getText();  // plain text version
    var commentFormattedText = quill.root.innerHTML;  // HTML content with styles

    if (commentPlainText.trim() !== "") {

        addComment(postId, commentPlainText, commentFormattedText);
        quill.setContents([]);
    } else {
        console.log("Comment text cannot be empty.");
    }
});

// Load post details and comments on page load
window.addEventListener('DOMContentLoaded', fetchAndDisplayPost);

// Voting function to handle upvote/downvote
async function vote(voteValue) {
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        alert("You need to be logged in to vote!");
        return;
    }
    
    const userId = user.uid;
    const postId = getPostIdFromURL();
    const postRef = doc(db, "posts", postId);
    const postSnapshot = await getDoc(postRef);

    if (postSnapshot.exists()) {
        const postData = postSnapshot.data();
        let votes = postData.votes || {};
        
        // Check the user's current vote
        const currentVote = votes[userId] || 0;

        // Determine the new vote value based on current vote
        let newVoteValue = voteValue;

        if (newVoteValue == 1){
            voteUp.classList.toggle('active');
        } else {
            voteDown.classList.toggle('active');
        }

        if (currentVote === voteValue) {
            newVoteValue = 0; // If user clicks the same vote, reset to 0
            //If it same vote, means it cancel vote
            voteUp.classList.remove('active');
            voteDown.classList.remove('active');
        }

        // Update the votes object
        votes[userId] = newVoteValue;

        // Calculate the new vote count
        const newVoteCount = Object.values(votes).reduce((acc, vote) => acc + vote, 0);

        // Update the document
        await updateDoc(postRef, {
            votes: votes,
            voteCount: newVoteCount
        });

        // Update the UI
        document.getElementById('vote-count').textContent = newVoteCount;
    } else {
        console.error("Post not found!");
    }
}

document.getElementById('upvote-btn').addEventListener('click', async () => {
    await vote(1);
});

document.getElementById('downvote-btn').addEventListener('click', async () => {
    await vote(-1);
});

document.getElementById('edit-post').addEventListener('click', function(){
    window.location.href = `editPost.html?id=${postId}`;
});

document.getElementById('delete-post').addEventListener('click', async function(){

    const postId = getPostIdFromURL();

    if (!postId) {
        console.error("Post ID is missing from the URL!");
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        //get current user
        const user = auth.currentUser;
        //prevent unauthorized delete
        if (!user){
            alert("You need to be logged in to delete!");
            return;
        }


        if (user.uid == postDoc.data().authorid){
            const confirmDelete = confirm("Are you sure you want to delete this post?");
            if (confirmDelete){
                try {
                    // Delete the post document from Firestore
                    await deleteDoc(postRef);
            
                    // Notify the user of successful deletion
                    console.log("Post successfully deleted!");
                    alert("Post deleted successfully!");
                    window.location.href = "discussion.html"; // Redirect to discussion page after deletion
            
                } catch (error) {
                    console.error("Error deleting post:", error);
                    alert("Failed to delete the post. Please try again.");
                }
            } else {
                return;
            }
        }
    }catch(error){
        console.error("Error fetching comments:", error);
    }
});