import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showPopup } from './popup.js';

// Initialize Quill editor
var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your reply here...',
    modules: {
        toolbar: '#toolbar-container'
    }
});

// Fetch and display feedback details
async function loadFeedbackDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const feedbackId = urlParams.get('id');

    if (!feedbackId) {
        alert("Feedback ID is missing.");
        return;
    }

    const feedbackDoc = await getDoc(doc(db, 'feedback', feedbackId));
    if (feedbackDoc.exists()) {
        const feedback = feedbackDoc.data();
        document.getElementById('feedback-title').textContent = feedback.title;
        document.getElementById('feedback-meta').textContent = `Submitted by ${feedback.authorEmail || 'Anonymous'} • ${new Date(feedback.timestamp).toLocaleDateString()}`;
        document.getElementById('feedback-content').textContent = feedback.plainText;
    } else {
        alert("Feedback not found.");
    }
}

// Function to handle sending the reply
async function sendReply() {
    const urlParams = new URLSearchParams(window.location.search);
    const feedbackId = urlParams.get('id');
    const replyContent = quill.root.innerHTML;

    if (!feedbackId || !replyContent.trim()) {
        alert("Cannot send an empty reply.");
        return;
    }

    try {
        // Update feedback document with reply
        await updateDoc(doc(db, 'feedback', feedbackId), {
            replyContent: replyContent,
            replied: true
        });

        // Send reply to user's email
        const feedbackDoc = await getDoc(doc(db, 'feedback', feedbackId));
        const feedback = feedbackDoc.data();
        const userEmail = feedback.authorEmail;

        if (userEmail) {
            await fetch('/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: userEmail,
                    subject: 'Reply to your feedback',
                    html: `<p>Dear user,</p><p>We have replied to your feedback:</p><div>${replyContent}</div><p>Thank you!</p>`
                })
            });

            showPopup({
                title: "Success",
                message: "Reply sent successfully.",
                type: "success",
                showCancel: false,
                onConfirm: () => {
                    window.location.href = `/admin/feedback`;
                }
            });
            quill.setContents([]);  // Clear the editor after submission
        } else {
            alert("User email not found.");
        }
    } catch (error) {
        console.error("Error sending reply:", error);
        alert("Failed to send reply.");
    }
}

// Event listener for reply submission
document.getElementById('submitReply').addEventListener('click', sendReply);

// Load feedback details on page load
window.addEventListener('DOMContentLoaded', loadFeedbackDetails);