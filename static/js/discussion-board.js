import { db } from './firebase-config.js'; // Import Firestore instance
import { collection, getDocs, query, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
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

// Store all discussions in memory for efficient search
let allDiscussions = [];

// Function to count comments for a post
async function getCommentCount(postId) {
    try {
        // Get the comments collection for this post
        const commentsRef = collection(db, 'comments', postId, 'msgId');
        const commentSnapshot = await getDocs(commentsRef);
        return commentSnapshot.size; // Returns the number of documents in the collection
    } catch (error) {
        console.error(`Error getting comment count for post ${postId}:`, error);
        return 0;
    }
}

// Function to fetch posts from Firestore and store in `allDiscussions`
async function fetchDiscussions(sortOption) {
    console.log("Fetching discussions with sort option:", sortOption);

    try {
        let q = query(collection(db, 'posts'));
        const querySnapshot = await getDocs(q);
        allDiscussions = [];

        // Use Promise.all to fetch all comment counts concurrently
        const discussionsWithComments = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
                const post = doc.data();
                post.id = doc.id;
                post.timestamp = post.timestamp ? new Date(post.timestamp) : new Date(0);
                
                // Get comment count for this post
                post.commentCount = await getCommentCount(post.id);
                
                return post;
            })
        );

        allDiscussions = discussionsWithComments;

        // Sort discussions based on option
        if (sortOption === 'recent') {
            allDiscussions.sort((a, b) => b.timestamp - a.timestamp);
        } else if (sortOption === 'most-vote') {
            allDiscussions.sort((a, b) => b.voteCount - a.voteCount);
        }

        console.log("Ordered discussions after fetch:", allDiscussions.map(d => ({
            title: d.title,
            timestamp: d.timestamp,
            commentCount: d.commentCount // Log comment count for debugging
        })));

        // Render discussions based on search term
        filterAndRenderDiscussions(document.getElementById("search-input").value);
    } catch (error) {
        console.error("Error fetching discussions: ", error);
    }
}

// Function to render filtered discussions
function filterAndRenderDiscussions(searchTerm) {
    const discussionList = document.getElementById('discussion-list');
    discussionList.innerHTML = '';  // Clear the current content

    // Filter discussions based on the search term
    const filteredDiscussions = allDiscussions.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render discussions in the order they’re already sorted by timestamp
    filteredDiscussions.forEach((post) => {
        const discussionItemElement = document.createElement('div');
        discussionItemElement.classList.add('discussion-item');

        discussionItemElement.innerHTML = `
            <div class="profile-section">
                <img src="${post.authorPfp || 'https://i.pinimg.com/736x/c0/27/be/c027bec07c2dc08b9df60921dfd539bd.jpg'}" alt="User" class="profile-pic">
            </div>
            <div class="discussion-main-content">
                <div class="discussion-title-and-meta">
                    <span class="discussion-title">
                        <a href="/user/post-details?id=${post.id}" class="post-link">${post.title}</a>
                    </span>
                    <div class="discussion-meta">
                        <span>Posted by <b>${post.authorName}</b></span> •
                        <span>${post.timestamp.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="discussion-category-status">
                    <span class="language-badge">${post.category}</span>
                    ${post.answered ? '<span class="answered-badge">Answered ✓</span>' : ''}
                </div>
            </div>
            <div class="discussion-comments-vote">
                <span class="comment-count">${post.commentCount || 0} comments</span>
                <span class="vote-count">↑ ${post.voteCount}</span>
            </div>
        `;

        // Attach the event listener to the post link
        discussionItemElement.querySelector('.post-link').addEventListener('click', handleNavigation);

        // Append the discussion item element to the discussion list
        discussionList.appendChild(discussionItemElement);
    });
}

// Event listener for sorting option change
document.getElementById('sort-option').addEventListener('change', function() {
    const selectedOption = this.value;
    fetchDiscussions(selectedOption);
});

// Event listener for search input
document.getElementById('search-input').addEventListener('input', function() {
    const searchTerm = this.value;
    filterAndRenderDiscussions(searchTerm);
});

// Call the fetchDiscussions function with the default sorting option when the page loads
window.addEventListener('DOMContentLoaded', () => fetchDiscussions('most-vote'));

document.getElementById('filter-cpp').addEventListener('change', applyFilters);
document.getElementById('filter-java').addEventListener('change', applyFilters);
document.getElementById('filter-python').addEventListener('change', applyFilters);
document.getElementById('filter-answered').addEventListener('change', applyFilters);
document.getElementById('filter-no-answer').addEventListener('change', applyFilters);

// Function to apply filters and re-render discussions
function applyFilters() {
    const searchTerm = document.getElementById("search-input").value;

    // Get selected language filters
    const selectedLanguages = [];
    if (document.getElementById('filter-cpp').checked) selectedLanguages.push("C++");
    if (document.getElementById('filter-java').checked) selectedLanguages.push("Java");
    if (document.getElementById('filter-python').checked) selectedLanguages.push("Python");

    // Get selected status filters
    const filterAnswered = document.getElementById('filter-answered').checked;
    const filterNoAnswer = document.getElementById('filter-no-answer').checked;

    // Filter discussions based on search term and selected filters
    const filteredDiscussions = allDiscussions.filter(post => {
        // Filter by search term in the title
        const matchesSearchTerm = post.title.toLowerCase().includes(searchTerm.toLowerCase());

        // Filter by language if any language is selected
        const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(post.category);

        // Filter by status
        const matchesStatus = (!filterAnswered && !filterNoAnswer) || 
                              (filterAnswered && post.answered) || 
                              (filterNoAnswer && !post.answered);

        return matchesSearchTerm && matchesLanguage && matchesStatus;
    });

    // Render the filtered discussions
    renderDiscussions(filteredDiscussions);
}

// Function to render discussions
function renderDiscussions(discussions) {
    const discussionList = document.getElementById('discussion-list');
    discussionList.innerHTML = '';  // Clear the current content

    discussions.forEach((post) => {
        const discussionItemElement = document.createElement('div');
        discussionItemElement.classList.add('discussion-item');

        discussionItemElement.innerHTML = `
            <div class="profile-section">
                <img src="${post.authorPfp || 'https://i.pinimg.com/736x/c0/27/be/c027bec07c2dc08b9df60921dfd539bd.jpg'}" alt="User" class="profile-pic">
            </div>
            <div class="discussion-main-content">
                <div class="discussion-title-and-meta">
                    <span class="discussion-title">
                        <a href="/user/post-details?id=${post.id}" class="post-link">${post.title}</a>
                    </span>
                    <div class="discussion-meta">
                        <span>Posted by <b>${post.authorName}</b></span> •
                        <span>${post.timestamp.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="discussion-category-status">
                    <span class="language-badge">${post.category}</span>
                    ${post.answered ? '<span class="answered-badge">Answered ✓</span>' : ''}
                </div>
            </div>
            <div class="discussion-comments-vote">
                <span class="comment-count">${post.commentCount || 0} comments</span>
                <span class="vote-count">↑ ${post.voteCount}</span>
            </div>
        `;

        // Attach the event listener to the post link
        discussionItemElement.querySelector('.post-link').addEventListener('click', handleNavigation);

        // Append the discussion item element to the discussion list
        discussionList.appendChild(discussionItemElement);
    });
}
