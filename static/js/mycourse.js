import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
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
document.querySelectorAll('nav a, .sidebar a').forEach(link => {
    link.addEventListener('click', handleNavigation);
});

// Function to fetch and render the enrolled courses
async function fetchAndRenderEnrolledCourses() {
    const user = auth.currentUser;

    if (!user) {
        console.log("No user logged in.");
        return;
    }

    const userId = user.uid;

    // Reference to the user's enrollment document
    const enrollmentRef = doc(db, 'enrollments', userId);
    try {
        // Fetch the user's enrollment data
        const enrollmentSnapshot = await getDoc(enrollmentRef);

        if (!enrollmentSnapshot.exists()) {
            showPopup({
                title: "No Course Enrolled",
                message: "You are not enrolled in any course. Please enroll in a course to continue.",
                type: "information",
                onConfirm: () => {
                    window.location.href = "/user/catalog";
                },
                showCancel: false
            });
            return;
        }

        const enrollmentData = enrollmentSnapshot.data();
        
        // Check if there are any courses in the enrollment data
        if (Object.keys(enrollmentData).length === 0) {
            showPopup({
                title: "No Course Enrolled",
                message: "You are not enrolled in any course. Please enroll in a course to continue.",
                type: "information",
                onConfirm: () => {
                    window.location.href = "/user/catalog";
                },
                showCancel: false
            });
            return;
        }

        const courseContainer = document.querySelector('.course-container');
        courseContainer.innerHTML = ''; // Clear existing content

        // Sort courses by lastStudyTime or enrolledOn
        const sortedCourseKeys = sortCoursesByTime(enrollmentData);

        for (const courseKey of sortedCourseKeys) {
            const courseId = courseKey.replace('courseId_', '');
            const courseEnrollment = enrollmentData[courseKey];

            // Fetch course data from the courses collection
            const courseRef = doc(db, 'courses', courseId);
            const courseSnapshot = await getDoc(courseRef);

            if (!courseSnapshot.exists()) {
                console.error(`Course ${courseId} not found in courses collection.`);
                continue;
            }

            const courseData = courseSnapshot.data();
            renderCourse(courseId, courseData, courseEnrollment);
        }
    } catch (error) {
        console.error("Error fetching enrollments or courses:", error);
    }
}

// Function to get the first incomplete module
function getFirstIncompleteModule(progress) {
    // Loop through the modules in the progress data
    let firstModuleId = ''; 
    for (let moduleId in progress) {
        const module = progress[moduleId];
        console.log('sorted module', moduleId);
        firstModuleId = moduleId;
        
        // Check if the module is not completed
        if (module.completed === false) {
            return moduleId;  // Return the module ID of the first incomplete module
        }
    }

    // If all modules are completed, return null or some other indication
    return firstModuleId;
}

function getFirstIncompleteTabId(enrollmentModule, courseModule) {
    let firstIncompleteTabId = null;
    let lastTabId = null;

    // Sort the tabs by their order in the course module (if relevant)
    const sortedTabs = courseModule.tabs.sort((a, b) => {
        return a.order - b.order;  // Assuming each tab has an 'order' field for sorting
    });

    // Loop through the sorted tabs in the course module
    for (let tab of sortedTabs) {
        const tabId = tab.id;
        const enrollmentTab = enrollmentModule.tabs[tabId];
        lastTabId = tabId;

        // Check if the tab exists in the enrollment and is not completed
        if (enrollmentTab && !enrollmentTab.completed) {
            firstIncompleteTabId = tabId;
            break;  // As soon as we find the first incomplete tab, exit the loop
        }
    }

    return firstIncompleteTabId || lastTabId;
}

// Function to render a single course
function renderCourse(courseId, courseData, courseEnrollment) {
    const courseContainer = document.querySelector('.course-container');
    const progressPercentage = calculateProgressPercentage(courseEnrollment.progress);
    const sortedModules = sortModules(courseEnrollment.progress.modules);

    // Get the first incomplete module from the enrollment data
    const firstIncompleteModuleId = getFirstIncompleteModule(sortedModules);

    if (!firstIncompleteModuleId) {
        console.error("No incomplete module found.");
        return;
    }

    const firstIncompleteModule = courseData.modules.find(module => module.id === firstIncompleteModuleId);
    const firstIncompleteTabId = getFirstIncompleteTabId(courseEnrollment.progress.modules[firstIncompleteModuleId], firstIncompleteModule);

    if (!firstIncompleteTabId) {
        console.error("No incomplete tab found.");
        return;
    }

    const firstIncompleteTab = firstIncompleteModule.tabs.find(tab => tab.id === firstIncompleteTabId);
    const moduleTitle = getModuleTitle(courseData, firstIncompleteModuleId);

    const courseElement = document.createElement('div');
    courseElement.id = `course-${courseId}`;
    courseElement.className = 'course';

    // Create the course HTML dynamically using template literals
    courseElement.innerHTML = `
        <div class="mycourse-header" onclick="toggleCourse('course-${courseId}')">
            <h2>${courseData.title || 'Unknown Course'}</h2>
            <div class="cprogress">
                <div class="cprogress-bar" id="${courseId}b" style="width: ${progressPercentage}%"></div>
                <div class="cprogress-text" id="${courseId}t">${progressPercentage}%</div>
                <span class="expand-icon">&#9650;</span>
            </div>
        </div>
        <div class="course-content-container" style="display: block;">
            <div class="module-title">Current Module: ${moduleTitle || 'Unknown Module'}</div>
            <div class="course-content">
                ${firstIncompleteModule ? firstIncompleteModule.tabs.map(tab => {
                    const isCompleted = courseEnrollment.progress.modules[firstIncompleteModuleId].tabs[tab.id].completed;
                    return `
                        <div class="lesson">
                            <div class="lesson-icon">
                                <span class="status-circle ${isCompleted ? 'completed' : ''}">${isCompleted ? '✔' : ''}</span>
                            </div>
                            <div class="lesson-info">
                                <div>${tab.type}</div>
                                <div>${tab.content.title}</div>
                            </div>
                        </div>
                    `;
                }).join('') : 'No incomplete module found.'}
            </div>
        </div>
        <div class="course-actions" style="display: block;">
            <button class="course-button" id="resume-${courseId}">Resume</button>
        </div>
    `;
    
    // Append the course HTML to the container
    courseContainer.appendChild(courseElement);
    setProgress(progressPercentage, courseId);
    
    // Ensure the button exists before adding the event listener
    const resumeButton = document.getElementById(`resume-${courseId}`);
    if (resumeButton) {
        resumeButton.addEventListener("click", function() {
            if (firstIncompleteTab && firstIncompleteTab.type) {
                window.location.href = `/user/${firstIncompleteTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${firstIncompleteModuleId}&tabId=${firstIncompleteTabId}`;
            } else {
                console.error("Incomplete tab data missing.");
            }
        });
    } else {
        console.error(`Resume button for course ${courseId} not found.`);
    }
}


// Function to calculate the progress percentage
function calculateProgressPercentage(progress) {
    let totalTabs = 0;
    let completedTabs = 0;

    // Loop through each module and tab in the progress data
    for (const moduleId in progress.modules) {
        const module = progress.modules[moduleId];

        for (const tabId in module.tabs) {
            totalTabs++;
            if (module.tabs[tabId].completed) {
                completedTabs++;
            }
        }
    }

    if (totalTabs === 0) return 0;  // Avoid division by zero

    // Calculate percentage with 2 decimal places
    return Number(((completedTabs / totalTabs) * 100).toFixed(2));
}

// Call the function to fetch and render enrolled courses
auth.onAuthStateChanged(user => {
    if (user) {
        fetchAndRenderEnrolledCourses();
    } else {
        console.log("User not logged in");
        window.location.href = '/'; // Redirect to login page
    }
});

function setProgress(progress, progressName) {
    const progressBar = document.getElementById(progressName+'b');
    const progressText = document.getElementById(progressName+'t');
    
    // Set the progress percentage
    progressBar.style.backgroundSize = progress + '% 100%';
    // Format the text to always show 2 decimal places
    progressText.textContent = progress.toFixed(2) + '%';
}

function getModuleTitle(courseData, moduleId) {
    // Loop through the modules array
    for (let module of courseData.modules) {
        if (module.id === moduleId) {
            return module.title;  // Return the module title if the module id matches
        }
    }
    return "Unknown Module";  // Return a default value if no matching module is found
}

function sortModules(modules) {
    return Object.keys(modules).sort().reduce((sortedModules, key) => {
        sortedModules[key] = modules[key];
        return sortedModules;
    }, {});
}

function sortCoursesByTime(enrollmentData) {
    return Object.keys(enrollmentData).sort((a, b) => {
        const courseA = enrollmentData[a];
        const courseB = enrollmentData[b];

        const timeA = courseA.progress?.lastStudyTime || courseA.enrolledOn;
        const timeB = courseB.progress?.lastStudyTime || courseB.enrolledOn;

        return new Date(timeB) - new Date(timeA); // Sort in descending order
    });
}

