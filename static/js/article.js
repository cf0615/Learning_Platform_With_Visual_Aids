import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
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

let currentUser = null;

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

function getParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const moduleId = urlParams.get('moduleId');
    const tabId = urlParams.get('tabId');

    return { courseId, moduleId, tabId };
}

async function loadArticleData(courseId, moduleId, tabId) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            const tabData = moduleData.tabs.find(tabs => tabs.id === tabId);
            
            if (moduleData && tabData && tabData.type === 'Article') {
                const articleTab = tabData;
                displayArticleContent(courseTitle, moduleTitle, articleTab);
            } else {
                console.error('Lesson tab not found');
            }

        } else {
            console.error('Course not found');
        }
    } catch (error) {
        console.error('Error loading article data:', error);
    }
}

function displayArticleContent(courseTitle, moduleTitle, articleTab) {
    document.querySelector('.course-info-content h2').textContent = courseTitle;
    document.querySelector('.course-info-content h3').textContent = 'Module: ' + moduleTitle;
    document.querySelector('.module-info h4').textContent = articleTab.content.title;
    document.getElementById('article-body').innerHTML = articleTab.content.content;
}

// Call the function with the desired articleId
document.addEventListener('DOMContentLoaded', () => {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    loadArticleData(courseId, moduleId, tabId);
});

async function markTabCompleteAndGoNext() {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    const userId = currentUser.uid;
    const enrollmentRef = doc(db, 'enrollments', userId);

    try {
        // Fetch enrollment data
        const enrollmentSnapshot = await getDoc(enrollmentRef);
        const enrollmentData = enrollmentSnapshot.data();
        const courseEnrollment = enrollmentData[`courseId_${courseId}`];

        // Mark the current tab as completed
        courseEnrollment.progress.modules[moduleId].tabs[tabId].completed = true;

        // Update the enrollment document in Firestore
        await setDoc(enrollmentRef, enrollmentData, { merge: true });

        // Check if the current module is completed
        const isModuleCompleted = checkIfModuleCompleted(courseEnrollment.progress.modules[moduleId]);

        if (isModuleCompleted) {
            courseEnrollment.progress.modules[moduleId].completed = true;
            
            // Check if the course is completed
            const isCourseCompleted = checkIfCourseCompleted(courseEnrollment.progress.modules);

            if (isCourseCompleted) {
                console.log("Course completed!");
                
                // Generate the digital badge for the student
                const courseRef = doc(db, 'courses', courseId);
                const courseSnapshot = await getDoc(courseRef);
                const courseData = courseSnapshot.data();

                await generateDigitalBadge(userId, courseId, courseData);
                alert("Congratulations! You have completed the course and earned a badge.");
            }
        }

        // Navigate to the next tab
        await goToNextTab(courseId, moduleId, tabId);
    } catch (error) {
        console.error("Error in markTabCompleteAndGoNext:", error);
    }
}

// Function to check if the module is completed
function checkIfModuleCompleted(module) {
    for (let tabId in module.tabs) {
        if (!module.tabs[tabId].completed) {
            return false;  // There are still tabs that are incomplete
        }
    }
    return true;  // All tabs in the module are completed
}

// Function to check if the course is completed
function checkIfCourseCompleted(modules) {
    for (let moduleId in modules) {
        if (!modules[moduleId].completed) {
            return false;  // There are still modules that are incomplete
        }
    }
    return true;  // All modules in the course are completed
}

// Function to generate a digital badge for the user
async function generateDigitalBadge(userId, courseId, courseData) {
    // Prepare badge data with additional course details
    const badgeData = {
        badgeId: `${userId}_${courseId}`,
        userId: userId,
        courseId: courseId,
        badgeIssuedOn: new Date().toISOString(),
        badgeType: "Course Completion",
        badgeUrl: courseData.badgeUrl,  // Example URL for the badge image
        title: `${courseData.title} Completion`,  // Use the course title for badge title
        description: `Awarded for successfully completing the ${courseData.title} course.`,
        skills: [courseData.category],  // Use category as a proxy for skills or primary language
        courseDescription: courseData.description  // Use course description
    };

    // Store the badge information in the Firestore 'badges' collection
    const badgeRef = doc(db, 'badges', `${userId}_${courseId}`);
    await setDoc(badgeRef, badgeData);
}

async function goToNextTab(courseId, moduleId, currentTabId) {
    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnapshot = await getDoc(courseRef);
        const courseData = courseSnapshot.data();
        const module = courseData.modules.find(mod => mod.id === moduleId);

        if (!module) {
            console.error("Module not found.");
            return;
        }

        // Get sorted tabs based on their order
        const sortedTabs = module.tabs;
        const currentTabIndex = sortedTabs.findIndex(tab => tab.id === currentTabId);

        if (currentTabIndex !== -1 && currentTabIndex < sortedTabs.length - 1) {
            const nextTab = sortedTabs[currentTabIndex + 1];
            const newUrl = `/user/${nextTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${moduleId}&tabId=${nextTab.id}`;
            await saveStudyTime();
            window.location.href = newUrl;
        } else {
            console.log("No more tabs in the current module.");

            // Check for the next module
            const currentModuleIndex = courseData.modules.findIndex(mod => mod.id === moduleId);
            if (currentModuleIndex !== -1 && currentModuleIndex < courseData.modules.length - 1) {
                const nextModule = courseData.modules[currentModuleIndex + 1];
                const firstTab = nextModule.tabs[0];
                const newUrl = `/user/${firstTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${nextModule.id}&tabId=${firstTab.id}`;
                alert("Proceeding to the next module.");
                await saveStudyTime();
                window.location.href = newUrl;
            } else {
                console.log("No more modules. Redirecting to dashboard.");
                await saveStudyTime();
                window.location.href = `/user/dashboard`;
            }
        }
    } catch (error) {
        console.error("Error navigating to the next tab:", error);
    }
}

document.getElementById("next-btn").addEventListener("click", markTabCompleteAndGoNext);