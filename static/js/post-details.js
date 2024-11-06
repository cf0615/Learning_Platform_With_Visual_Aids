import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, deleteDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
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

let userId = null;
let userName = null;
const voteUp = document.getElementById('upvote-btn');
const voteDown = document.getElementById('downvote-btn');

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

            // Create comment HTML with smaller profile picture
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            commentElement.innerHTML = `
                <img src="${commentData.authorPfp || 'default-avatar.png'}" alt="Profile" class="comment-pfp">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${commentData.authorName}</span>
                        <span class="comment-date">${formattedDate}</span>
                    </div>
                    <div class="comment-text">
                        ${commentData.formattedText}
                    </div>
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
async function addComment(postId, commentPlainText, commentFormattedText) {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to comment");
        return;
    }

    try {
        // Fetch user data from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            console.error("User document not found!");
            return;
        }

        const userData = userDoc.data();
        const authorPfp = userData.pfpUrl || "../static/img/default-user.jpg";
        const authorName = userData.username || user.email;
        const authorId = user.uid;
        const timestamp = new Date();

        console.log("User data for comment:", {
            authorPfp,
            authorName,
            authorId,
            timestamp
        });

        // Create a reference to the comments collection
        const postCommentRef = doc(db, 'comments', postId);
        const commentId = doc(collection(postCommentRef, 'msgId'));

        // Add the comment document
        await setDoc(commentId, {
            authorPfp,
            authorName,
            authorId,
            plainText: commentPlainText,
            formattedText: commentFormattedText,
            timestamp
        });

        console.log("Comment added successfully!");
        // Refresh comments display
        await fetchAndDisplayComments(postId);
        
    } catch (error) {
        console.error("Error adding comment:", error);
        alert("Failed to add comment. Please try again.");
    }
}

// Call this function when submit button is clicked
document.getElementById('submit-comment-btn').addEventListener('click', async () => {
    const postId = getPostIdFromURL();
    
    // Get both plain text and formatted content from Quill
    const commentPlainText = quill.getText().trim();
    const commentFormattedText = quill.root.innerHTML;

    if (commentPlainText !== "") {
        try {
            await addComment(postId, commentPlainText, commentFormattedText);
            // Clear the editor after successful comment
            quill.setContents([{ insert: '\n' }]);
        } catch (error) {
            console.error("Error in comment submission:", error);
            alert("Failed to submit comment. Please try again.");
        }
    } else {
        alert("Comment cannot be empty.");
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
    window.location.href = `/user/editPost?id=${postId}`;
});

document.getElementById('delete-post').addEventListener('click', async function() {
    const postId = getPostIdFromURL();

    if (!postId) {
        console.error("Post ID is missing from the URL!");
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        const user = auth.currentUser;
        if (!user) {
            showPopup({
                title: "Authentication Required",
                message: "You need to be logged in to delete posts.",
                type: "error",
                showCancel: false
            });
            return;
        }

        if (user.uid === postDoc.data().authorid) {
            showPopup({
                title: "Confirm Deletion",
                message: "Are you sure you want to delete this post? This action cannot be undone.",
                type: "warning",
                showCancel: true,
                onConfirm: async () => {
                    try {
                        await deleteDoc(postRef);
                        
                        showPopup({
                            title: "Success",
                            message: "Post deleted successfully!",
                            type: "success",
                            showCancel: false,
                            onConfirm: () => {
                                window.location.href = "/user/discussion";
                            }
                        });
                    } catch (error) {
                        console.error("Error deleting post:", error);
                        showPopup({
                            title: "Error",
                            message: "Failed to delete the post. Please try again.",
                            type: "error",
                            showCancel: false
                        });
                    }
                }
            });
        } else {
            showPopup({
                title: "Permission Denied",
                message: "You can only delete your own posts.",
                type: "error",
                showCancel: false
            });
        }
    } catch (error) {
        console.error("Error fetching post:", error);
        showPopup({
            title: "Error",
            message: "An error occurred while processing your request.",
            type: "error",
            showCancel: false
        });
    }
});

// Add the markAsAnswered function
async function markAsAnswered() {
    const postId = getPostIdFromURL();
    const user = auth.currentUser;

    if (!postId || !user) {
        console.error("Post ID or user missing!");
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (!postDoc.exists()) {
            console.error("Post not found!");
            return;
        }

        // Check if user is the author
        if (user.uid !== postDoc.data().authorid) {
            showPopup({
                title: "Permission Denied",
                message: "Only the post author can mark as answered!",
                type: "error",
                showCancel: false
            });
            return;
        }

        // Update the answered status
        await updateDoc(postRef, {
            answered: true
        });

        console.log("Post marked as answered!");
        showPopup({
            title: "Success",
            message: "Post marked as answered!",
            type: "success",
            showCancel: false,
            onConfirm: () => {
                window.location.reload();  // Reload only after user clicks OK
            }
        });

    } catch (error) {
        console.error("Error marking post as answered:", error);
        showPopup({
            title: "Error",
            message: "Failed to mark post as answered. Please try again.",
            type: "error",
            showCancel: false
        });
    }
}

// Add event listener for the mark as answered button
document.getElementById('mark-answered').addEventListener('click', markAsAnswered);