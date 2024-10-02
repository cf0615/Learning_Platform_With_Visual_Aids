import { db } from './firebase-config.js'; // Import Firestore instance
import { collection, getDocs, query, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Function to fetch and render posts
async function fetchAndRenderDiscussions(sortOption) {
    const discussionList = document.getElementById('discussion-list');
    discussionList.innerHTML = '';  // Clear the current content
    console.log("Fetching discussions with sort option:", sortOption);

    try {
        // Define Firestore query based on sort option
        let q;
        if (sortOption === 'most-vote') {
            q = query(collection(db, 'posts'), orderBy('voteCount', 'desc')); // Order by voteCount descending
        } else if (sortOption === 'recent') {
            q = query(collection(db, 'posts'), orderBy('timestamp', 'desc')); // Order by timestamp descending
        } else {
            q = query(collection(db, 'posts')); // Default query if no sorting option is selected
        }

        // Get posts collection from Firestore
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (doc) => {
            const post = doc.data();
            const postId = doc.id;  // Get the document ID (post ID)
            
            // Fetch the comment count for this post
            const commentsRef = collection(db, `comments/${postId}/msgId`);
            const commentsSnapshot = await getDocs(commentsRef);
            const commentCount = commentsSnapshot.size; // Get the count of comments

            // Create a new discussion item
            const discussionItem = `
                <div class="discussion-item">
                    <div class="profile-section">
                        <img src="${post.authorPfp || '../img/default-profile-pic.jpg'}" alt="User" class="profile-pic">
                    </div>
                    <div class="discussion-main-content">
                        <div class="discussion-title-and-meta">
                            <span class="discussion-title"><a href="post-details.html?id=${postId}">${post.title}</a></span>
                            <div class="discussion-meta">
                                <span>Posted by <b>${post.authorName}</b></span> •
                                <span>${new Date(post.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="discussion-category-status">
                            <span class="language-badge">${post.category}</span>
                            ${post.answered ? '<span class="answered-badge">Answered ✓</span>' : ''}
                        </div>
                    </div>
                    <div class="discussion-comments-vote">
                        <span class="comment-count">${commentCount} comments</span>  <!-- Placeholder for comment count -->
                        <span class="vote-count">↑ ${post.voteCount}</span>
                    </div>
                </div>
            `;

            // Add the discussion item to the discussion list
            discussionList.innerHTML += discussionItem;
        });

    } catch (error) {
        console.error("Error fetching discussions: ", error);
    }
}

// Event listener for sorting option change
document.getElementById('sort-option').addEventListener('change', function() {
    const selectedOption = this.value;
    fetchAndRenderDiscussions(selectedOption);
});

// Call the fetchAndRenderDiscussions function with the default sorting option when the page loads
window.addEventListener('DOMContentLoaded', () => fetchAndRenderDiscussions('most-vote'));
