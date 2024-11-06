import { db } from './firebase-config.js'; // Import Firestore instance
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Store all feedback in memory for efficient search
let allFeedback = [];

// Function to fetch and render feedback list
async function fetchAndRenderFeedback() {
    try {
        // Query Firestore to get feedback collection
        const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        // Clear and populate allFeedback array
        allFeedback = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        // Initial render with empty search term
        filterAndRenderFeedback('');
    } catch (error) {
        console.error("Error fetching feedback: ", error);
    }
}

// Function to filter and render feedback based on search term
function filterAndRenderFeedback(searchTerm) {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';  // Clear the current content

    // Filter feedback based on the search term
    const filteredFeedback = allFeedback.filter(feedback =>
        feedback.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (feedback.authorEmail && feedback.authorEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Render filtered feedback
    filteredFeedback.forEach((feedback) => {
        const feedbackItemElement = document.createElement('div');
        feedbackItemElement.classList.add('feedback-item');

        feedbackItemElement.innerHTML = `
            <div class="feedback-profile-section">
                <img src="${feedback.authorPfp}" alt="User" class="feedback-profile-pic">
            </div>
            <div class="feedback-main-content">
                <div class="feedback-title-and-meta">
                    <span class="feedback-title">
                        <a href="/admin/replyFeedback?id=${feedback.id}" class="feedback-link">${feedback.title}</a>
                    </span>
                    <div class="feedback-meta">
                        <span>by <b>${feedback.authorEmail || 'Anonymous'}</b></span> •
                        <span>${new Date(feedback.timestamp).toLocaleDateString()}</span>
                        <div class="feedback-status ${feedback.replied ? 'status-replied' : 'status-pending'}">
                            ${feedback.replied ? 'Replied' : 'Pending'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        feedbackItemElement.querySelector('.feedback-link').addEventListener('click', handleNavigation);

        feedbackList.appendChild(feedbackItemElement);
    });
}

// Function to handle navigation with time saving (if required)
async function handleNavigation(event) {
    event.preventDefault();  // Prevent default link navigation
    const targetUrl = event.currentTarget.getAttribute('href');  // Get the URL from the clicked link
    window.location.href = targetUrl;
}

// Call the fetchAndRenderFeedback function when the page loads
window.addEventListener('DOMContentLoaded', () => fetchAndRenderFeedback());

// Event listener for search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-discussions input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAndRenderFeedback(e.target.value);
        });
    }
});
