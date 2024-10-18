import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

let courseId = null;
let currentUser = null;
let moduleCounter = 0;


// Function to initialize the page
async function initializePage() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("User is logged in:", user);
            loadCourseData();
        } else {
            console.log("No user is logged in, redirecting to login page.");
            window.location.href = "login.html";
        }
    });
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
        window.location.href = `editModule.html?courseId=${courseId}&moduleId=${moduleId}`;
    });

    document.getElementById('module-list').appendChild(moduleContainer);
}

// Function to save course data to Firebase
async function saveCourseData(isPublished = false) {
    if (!currentUser) {
        alert('You must be logged in to save a course.');
        return;
    }

    const newCourseData = {
        title: document.getElementById('course-title').textContent,
        description: document.getElementById('course-description').value,
        category: document.getElementById('course-category').value,
        modules: Array.from(document.querySelectorAll('.module-card')).map(moduleEl => ({
            id: moduleEl.id,
            title: moduleEl.querySelector('h3').textContent,
            tabs: [] // Assuming tabs are handled elsewhere
        })),
        isPublished: isPublished,
        lastUpdated: new Date().toUTCString(),
        authorId: currentUser.uid
    };

    try {
        if (courseId) {
            const courseDocRef = doc(db, 'courses', courseId);
            const courseSnapshot = await getDoc(courseDocRef);

            if (courseSnapshot.exists()) {
                const existingCourseData = courseSnapshot.data();

                // Check for changes
                const hasChanges = (
                    newCourseData.title !== existingCourseData.title ||
                    newCourseData.description !== existingCourseData.description ||
                    newCourseData.modules.length !== existingCourseData.modules.length
                );

                if (hasChanges) {
                    // Append new modules
                    const existingModuleIds = existingCourseData.modules.map(mod => mod.id);
                    newCourseData.modules.forEach(mod => {
                        if (!existingModuleIds.includes(mod.id)) {
                            existingCourseData.modules.push(mod);
                        }
                    });

                    await setDoc(courseDocRef, { ...existingCourseData, ...newCourseData }, { merge: true });
                    console.log('Course updated successfully.');
                }
            } else {
                console.log('Course does not exist.');
            }
        } else {
            const newDocRef = await addDoc(collection(db, 'courses'), newCourseData);
            courseId = newDocRef.id;
            console.log('New course created successfully with ID:', courseId);
        }

        window.location.href = `editCourse.html?courseId=${courseId}`;
        
    } catch (error) {
        console.error('Error saving course data:', error);

        if (error.code === 'permission-denied') {
            alert('You do not have permission to perform this action. Please check your Firestore security rules.');
        } else {
            alert('Error saving course data. Please try again.');
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initializePage);

document.getElementById('add-new-module').addEventListener('click', () => addModuleToUI());

document.getElementById('save-draft').addEventListener('click', () => saveCourseData(false));

document.getElementById('publish-course').addEventListener('click', () => saveCourseData(true));
