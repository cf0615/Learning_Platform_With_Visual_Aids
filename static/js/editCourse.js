import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { showPopup } from './popup.js';

let courseId = null;
let currentUser = null;
let moduleCounter = 0;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;  // Store the user globally
        console.log("User is logged in:", currentUser.uid);
        // Proceed with your logic after the user is confirmed logged in
    } else {
        console.log("User not logged in");
        window.location.href = '/';  // Redirect to login page if not logged in
    }
});

async function initializePage() {
    loadCourseData();
}

// Function to load course data from Firebase
async function loadCourseData() {
    const urlParams = new URLSearchParams(window.location.search);
    courseId = urlParams.get('courseId');  // Retrieve courseId from URL
    let moduleCounter = 0;

    if (courseId) {
        // Editing an existing course
        try {
            const courseDocRef = doc(db, 'courses', courseId);
            const courseSnapshot = await getDoc(courseDocRef);

            if (courseSnapshot.exists()) {
                const courseData = courseSnapshot.data();
                console.log('Course data loaded:', courseData);

                // Populate UI with course data
                document.getElementById('course-title').textContent = courseData.title || '';
                document.getElementById('course-description').value = courseData.description || '';
                document.getElementById('course-category').value = courseData.category || '';
                
                // Load existing modules if available
                if (courseData.modules) {
                    moduleCounter = 0;
                    courseData.modules.forEach(module => addModuleToUI(module));
                }

                // Display course badge if exists
                if (courseData.badgeUrl) {
                    document.getElementById('badge-preview').src = courseData.badgeUrl;
                    document.getElementById('badge-preview').style.display = 'block';
                }
            } else {
                console.log('Course does not exist.');
            }
        } catch (error) {
            console.error('Error loading course data:', error);
        }
    }
}

// Function to add a module to the UI
function addModuleToUI(moduleData = {}) {
    moduleCounter++;
    const moduleId = moduleData.id || `module-${moduleCounter}`;

    // Ensure tabs is an array
    moduleData.tabs = moduleData.tabs || [];

    // Initialize module data if it's a new module
    if (!moduleData.id) {
        moduleData = {
            id: moduleId,
            title: `Module ${moduleCounter}: New Module`,
            tabs: []
        };
        // Save this new module data to localStorage
        localStorage.setItem(moduleId, JSON.stringify(moduleData));
    }

    const moduleContainer = document.createElement('div');
    moduleContainer.className = 'module-card';
    moduleContainer.id = moduleId;

    moduleContainer.innerHTML = `
        <div class="module-header">
            <h3 contenteditable="true">${moduleData.title}</h3>
            <button class="edit-module-btn">Edit Module</button>
        </div>
        <ul class="module-content-list">
            ${moduleData.tabs.map(tab => `<li>${tab.type}: ${tab.content.title}</li>`).join('')}
        </ul>
    `;

    moduleContainer.querySelector('.edit-module-btn').addEventListener('click', async () => {
        await saveCourseData(false); // Auto-save as draft
        window.location.href = `/admin/editModule?courseId=${courseId}&moduleId=${moduleId}`;
    });

    document.getElementById('module-list').appendChild(moduleContainer);
}

// Function to save course data to Firebase
async function saveCourseData(isPublished = false) {
    if (!currentUser) {
        showPopup({
            title: "Error",
            message: "You must be logged in to save a course.",
            type: "error",
            showCancel: false
        });
        return;
    }

    // Prepare new course data
    const courseBadgeFile = document.getElementById('course-badge').files[0];
    let courseBadgeUrl = '';

    if (courseBadgeFile) {
        try {
            const badgeRef = ref(storage, `course_badges/${currentUser.uid}_${Date.now()}`);
            await uploadBytes(badgeRef, courseBadgeFile);
            courseBadgeUrl = await getDownloadURL(badgeRef);
        } catch (error) {
            console.error("Error uploading course badge:", error);
            showPopup({
                title: "Error",
                message: "Failed to upload course badge. Please try again.",
                type: "error",
                showCancel: false
            });
            return;
        }
    }

    const newCourseData = {
        title: document.getElementById('course-title').textContent,
        description: document.getElementById('course-description').value,
        category: document.getElementById('course-category').value,
        badgeUrl: courseBadgeUrl || document.getElementById('badge-preview').src,  // Save or retain existing badge URL
        modules: Array.from(document.querySelectorAll('.module-card')).map(moduleEl => ({
            id: moduleEl.id,
            title: moduleEl.querySelector('h3').textContent,
            tabs: [] // We'll populate or retain existing tabs later
        })),
        isPublished: isPublished,
        lastUpdated: new Date().toUTCString(),
        authorId: currentUser.uid
    };

    try {
        if (!courseId) {
            // Creating new course
            const newDocRef = await addDoc(collection(db, 'courses'), newCourseData);
            courseId = newDocRef.id;
            console.log('New course created successfully with ID:', courseId);
        } else {
            // Updating existing course
            const courseDocRef = doc(db, 'courses', courseId);
            const courseSnapshot = await getDoc(courseDocRef);

            if (courseSnapshot.exists()) {
                const existingCourseData = courseSnapshot.data();

                // Get all existing module IDs
                const existingModuleIds = existingCourseData.modules.map(mod => mod.id);

                // Merge new modules with existing ones and retain `tabs`
                newCourseData.modules = newCourseData.modules.map(newMod => {
                    const existingModule = existingCourseData.modules.find(m => m.id === newMod.id);
                    return existingModule ? { ...newMod, tabs: existingModule.tabs || [] } : newMod;
                });

                newCourseData.modules.forEach(mod => {
                    if (!existingModuleIds.includes(mod.id)) {
                        existingCourseData.modules.push(mod);
                    }
                });

                // Save the merged data back to Firestore
                await setDoc(courseDocRef, { ...existingCourseData, ...newCourseData }, { merge: true });
                
            }
        }

        // Show success popup based on whether publishing or saving draft
        if (isPublished) {
            showPopup({
                title: "Success",
                message: "Course has been published successfully!",
                type: "success",
                showCancel: false,
                onConfirm: () => {
                    window.location.href = `/admin/editCourse?courseId=${courseId}`;
                }
            });
        } else {
            // For draft saving, redirect immediately
            showPopup({
                title: "Success",
                message: "Course draft has been updated successfully!",
                type: "success",
                showCancel: false,
                onConfirm: () => {
                    window.location.href = `/admin/editCourse?courseId=${courseId}`;
                }
            });
        }

    } catch (error) {
        console.error('Error saving course data:', error);
        showPopup({
            title: "Error",
            message: "Failed to save course data. Please try again.",
            type: "error",
            showCancel: false
        });
    }
}

// Image preview for course badge
document.getElementById('course-badge').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('badge-preview').src = e.target.result;
            document.getElementById('badge-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', initializePage);
document.getElementById('add-new-module').addEventListener('click', () => addModuleToUI());
document.getElementById('save-draft').addEventListener('click', () => saveCourseData(false));
document.getElementById('publish-course').addEventListener('click', () => saveCourseData(true));
