import { auth, db, storage } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, orderBy, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { showPopup, showInputPopup, hidePopup } from './popup.js';  // Import both functions
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Add notification click handler
document.getElementById('notification-icon')?.addEventListener('click', () => {
    const announcementList = document.getElementById('announcement-list');
    announcementList.classList.toggle('hidden');
    const user = auth.currentUser; // Get current user
    if (user) {
        loadAnnouncements('announcements', user); // Load announcements by default
    }
});

async function loadAnnouncements(type = 'announcements', user) {
    if (!user) {
        console.error('No user provided to loadAnnouncements');
        return;
    }

    const announcementContainer = document.getElementById('announcement-list');
    if (!announcementContainer) return;
    
    // Create header only if it doesn't exist
    if (!document.getElementById('announcement-header')) {
        announcementContainer.innerHTML = `
            <div id="announcement-header" class="announcement-header">
                <div class="tab" data-type="announcements">
                    Announcements
                </div>
                <div class="tab" data-type="feedback">
                    Feedback
                </div>
            </div>
            <div class="announcement-content"></div>
        `;

        // Add click handlers for tabs (only once)
        const tabs = announcementContainer.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const selectedType = e.target.dataset.type;
                loadAnnouncements(selectedType, user);
            });
        });
    }

    // Update active tab state
    const tabs = announcementContainer.querySelectorAll('.tab');
    tabs.forEach(tab => {
        if (tab.dataset.type === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const contentContainer = announcementContainer.querySelector('.announcement-content');
    contentContainer.innerHTML = ''; // Clear existing content

    try {
        const collectionRef = collection(db, type);
        let q;

        if (type === 'feedback') {
            console.log('Loading feedback for user:', user.uid);
            q = query(
                collectionRef, 
                where('authorId', '==', user.uid)  // Changed from courseId to authorId
            );
        } else {
            q = query(collectionRef, orderBy('date', 'desc'));
        }

        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (items.length === 0) {
            contentContainer.innerHTML = `
                <div class="announcement-empty">
                    <p>No ${type} yet</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'announcement-item';
            
            if (type === 'feedback') {
                // For feedback items
                itemElement.innerHTML = `
                    <strong>${item.title || 'Feedback'}</strong>
                    <p>${item.formattedContent || item.plainText}</p>
                    <small>${formatDate(item.timestamp)}</small>
                `;
                
                itemElement.addEventListener('click', () => {
                    showPopup({
                        title: item.title || 'Feedback',
                        message: `
                            <div class="announcement-popup-content">
                                <p>${item.formattedContent || item.plainText}</p>
                                <div class="feedback-reply">
                                    <h4>Admin Reply:</h4>
                                    <p>${item.replyContent || 'No reply yet'}</p>
                                </div>
                                <small class="announcement-date">${formatDate(item.timestamp)}</small>
                            </div>
                        `,
                        type: "information",
                        showCancel: false
                    });
                });
            } else {
                // For announcements
                itemElement.innerHTML = `
                    <strong>${item.title}</strong>
                    <p>${item.content}</p>
                    <small>${formatDate(item.date)}</small>
                `;
                
                itemElement.addEventListener('click', () => {
                    showPopup({
                        title: item.title,
                        message: `
                            <div class="announcement-popup-content">
                                <p>${item.content}</p>
                                <small class="announcement-date">${formatDate(item.date)}</small>
                            </div>
                        `,
                        type: "information",
                        showCancel: false
                    });
                });
            }
            
            contentContainer.appendChild(itemElement);
        });
    } catch (error) {
        console.error(`Error loading ${type}:`, error);
        contentContainer.innerHTML = `
            <div class="announcement-empty">
                <p>Failed to load ${type}</p>
            </div>
        `;
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} minutes ago`;
        }
        return `${hours} hours ago`;
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Function to retrieve user data and update UI
async function updateUserInfo() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in, fetch user data from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Update the username display
                const userNameElement = document.querySelector(".user-name");
                if (userNameElement) {
                    userNameElement.textContent = userData.username;
                }

                // Update the user icon (profile picture)
                const userIconElement = document.querySelector(".user-icon");
                if (userIconElement && userData.pfpUrl) {
                    userIconElement.style.backgroundImage = `url('${userData.pfpUrl}')`;
                    userIconElement.style.backgroundSize = "cover";
                    userIconElement.style.backgroundPosition = "center";
                }

                // Load announcements with the authenticated user
                const announcementList = document.getElementById('announcement-list');
                if (!announcementList.classList.contains('hidden')) {
                    loadAnnouncements('announcements', user);
                }
            } else {
                console.log("No such user document!");
            }
        } else {
            console.log("User is not signed in");
        }
    });
}

// Call this function on page load or user state change
updateUserInfo();

// Update the click handler for user profile menu
document.querySelector('.user-profile-menu')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = document.querySelector('.user-dropdown');
    dropdown.classList.toggle('show');
    dropdown.classList.toggle('hidden'); // Remove hidden class when showing
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.user-dropdown');
    const profileMenu = document.querySelector('.user-profile-menu');
    
    if (dropdown && !profileMenu.contains(e.target)) {
        dropdown.classList.remove('show');
        dropdown.classList.add('hidden');
    }
});

// Update the edit profile click handler
document.getElementById('edit-profile')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        showInputPopup({
            title: "Edit Profile",
            htmlContent: `
                <div class="edit-profile-form">
                    <div class="profile-section">
                        <label>Profile Picture</label>
                        <img id="edit-profile-preview" src="${userData.pfpUrl || '../static/img/default-user.jpg'}" 
                             alt="Profile Preview" class="profile-preview-img">
                        
                        <input type="file" id="edit-profile-picture" accept="image/*" style="display: none;">
                        <button type="button" class="upload-btn" 
                                onclick="document.getElementById('edit-profile-picture').click()">
                            Change Profile Picture
                        </button>
                    </div>
                    <div class="form-group">
                        <label for="edit-username">Username</label>
                        <input type="text" id="edit-username" value="${userData.username || ''}" 
                               placeholder="Enter username">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="reset-btn" id="reset-password-btn">
                            Reset Password
                        </button>
                    </div>
                </div>
            `,
            showCancel: true,
            onConfirm: async () => {
                try {
                    const newUsername = document.getElementById('edit-username').value;
                    const profilePicture = document.getElementById('edit-profile-picture').files[0];

                    if (!newUsername.trim()) {
                        showPopup({
                            title: "Error",
                            message: "Username cannot be empty",
                            type: "error",
                            showCancel: false
                        });
                        return;
                    }

                    // Show loading state
                    showPopup({
                        title: "Updating Profile",
                        type: "loading"
                    });

                    let newPfpUrl = userData.pfpUrl;
                    if (profilePicture) {
                        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                        await uploadBytes(storageRef, profilePicture);
                        newPfpUrl = await getDownloadURL(storageRef);
                    }

                    await updateDoc(doc(db, "users", user.uid), {
                        username: newUsername,
                        pfpUrl: newPfpUrl
                    });

                    hidePopup();
                    showPopup({
                        title: "Success",
                        message: "Profile updated successfully!",
                        type: "success",
                        showCancel: false,
                        onConfirm: () => {
                            window.location.reload();
                        }
                    });
                } catch (error) {
                    console.error("Error updating profile:", error);
                    showPopup({
                        title: "Error",
                        message: "Failed to update profile. Please try again.",
                        type: "error",
                        showCancel: false
                    });
                }
            }
        });

        // Add image preview handler
        document.getElementById('edit-profile-picture')?.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('edit-profile-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Add reset password handler
        document.getElementById('reset-password-btn')?.addEventListener('click', async () => {
            try {
                await sendPasswordResetEmail(auth, user.email);
                showPopup({
                    title: "Password Reset Email Sent",
                    message: "Please check your email to reset your password.",
                    type: "success",
                    showCancel: false
                });
            } catch (error) {
                console.error("Error sending reset email:", error);
                showPopup({
                    title: "Error",
                    message: "Failed to send reset email. Please try again.",
                    type: "error",
                    showCancel: false
                });
            }
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        showPopup({
            title: "Error",
            message: "Failed to load profile data. Please try again.",
            type: "error",
            showCancel: false
        });
    }
});

document.getElementById('logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
        await auth.signOut();
        window.location.href = '/';
    } catch (error) {
        console.error('Error signing out:', error);
        showPopup({
            title: "Error",
            message: "Failed to sign out. Please try again.",
            type: "error",
            showCancel: false
        });
    }
});