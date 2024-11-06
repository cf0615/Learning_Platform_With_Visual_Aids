import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showPopup, hidePopup } from './popup.js';

// Initialize Quill editor
const quill = new Quill('#editor-container', {
    theme: 'snow'
});

// Add a variable to track the currently edited announcement
let currentEditId = null;

// Add reset button functionality
document.getElementById('reset-btn').addEventListener('click', () => {
    if (currentEditId) {
        showPopup({
            title: 'Confirm Reset',
            message: 'Are you sure you want to cancel editing? All changes will be lost.',
            type: 'warning',
            showCancel: true,
            onConfirm: () => {
                currentEditId = null;
                document.getElementById('announcement-title').value = '';
                quill.setText('');
            }
        });
    } else {
        currentEditId = null;
        document.getElementById('announcement-title').value = '';
        quill.setText('');
    }
});

// Load announcements from Firebase
async function loadAnnouncements() {
    const announcementsCol = collection(db, 'announcements');
    const announcementSnapshot = await getDocs(announcementsCol);
    const announcementList = announcementSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const notificationList = document.querySelector('.notification-list');
    notificationList.innerHTML = '<h2>Notify</h2>'; // Clear existing content

    announcementList.forEach(announcement => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <span>${announcement.title}</span>
            <span>${new Date(announcement.date).toLocaleString()}</span>
            <button class="edit-btn">Edit</button>
        `;
        notificationList.appendChild(item);

        // Modified edit button click handler
        item.querySelector('.edit-btn').addEventListener('click', () => {
            currentEditId = announcement.id;  // Store the current announcement ID
            document.getElementById('announcement-title').value = announcement.title;
            quill.setText(announcement.content);
        });
    });
}

// Modified save functionality
document.getElementById('push-btn').addEventListener('click', async () => {
    const title = document.getElementById('announcement-title').value;
    const content = quill.getText();

    if (title.trim() === '' || content.trim() === '') {
        showPopup({
            title: 'Error',
            message: 'Title and content cannot be empty.',
            type: 'error'
        });
        return;
    }

    try {
        showPopup({
            title: 'Saving',
            message: 'Saving announcement...',
            type: 'loading'
        });

        if (currentEditId) {
            // Update existing announcement
            await updateDoc(doc(db, 'announcements', currentEditId), {
                title: title,
                content: content,
                date: new Date().toISOString()
            });
            currentEditId = null;  // Reset the edit state
        } else {
            // Create new announcement
            await addDoc(collection(db, 'announcements'), {
                title: title,
                content: content,
                date: new Date().toISOString()
            });
        }
        
        hidePopup(); // Hide the loading popup
        showPopup({
            title: 'Success',
            message: 'Announcement saved successfully!',
            type: 'success'
        });
        
        document.getElementById('announcement-title').value = '';
        quill.setText('');
        loadAnnouncements(); // Reload announcements
    } catch (error) {
        hidePopup(); // Hide the loading popup
        showPopup({
            title: 'Error',
            message: 'Error saving announcement: ' + error.message,
            type: 'error'
        });
        console.error('Error saving announcement:', error);
    }
});

// Load announcements on page load
loadAnnouncements();
