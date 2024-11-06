import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function
import { showPopup } from './popup.js';  // Import the showPopup function

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
    const type = window.location.pathname.split('/')[2]; // Extract type from /user/{type}

    return { courseId, moduleId, tabId, type };
}

async function loadQuizData(courseId, moduleId, tabId) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            const tabData = moduleData.tabs.find(tabs => tabs.id === tabId);

            if (moduleData && tabData && tabData.type === 'Quiz') {
                const quizTab = tabData;
                console.log('Quiz Data:', quizTab.content.questions); // Debugging log
                displayQuizContent(courseTitle, moduleTitle, quizTab);
            } else {
                console.error('Quiz tab not found');
            }
        } else {
            console.error('Course not found');
        }
    } catch (error) {
        console.error('Error loading quiz data:', error);
    }
}

function displayQuizContent(courseTitle, moduleTitle, quizTab) {
    document.querySelector('.course-info-content h2').textContent = courseTitle;
    document.querySelector('.course-info-content h3').textContent = 'Module: ' + moduleTitle;
    document.querySelector('.module-info h4').textContent = quizTab.content.title;
    const questions = quizTab.content.questions;
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = ''; // Clear existing content

    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'quiz-item';
        questionElement.innerHTML = `
            <h2>${index + 1}. ${question.question}</h2>
            <div class="options">
                ${question.choices.map((choice, i) => `
                    <label>
                        <input type="radio" name="question-${index}" value="${choice}">
                        ${choice}
                    </label>
                `).join('')}
            </div>
        `;
        quizContainer.appendChild(questionElement);
    });

}

function checkAnswers(questions) {
    let score = 0;
    questions.forEach((question, index) => {
        const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
        if (selectedOption) {
            const selectedIndex = Array.from(selectedOption.parentElement.parentElement.children).indexOf(selectedOption.parentElement);
            const correctIndex = parseInt(question.correctAnswer.split(' ')[1]) - 1;
            if (selectedIndex === correctIndex) {
                score++;
            }
        }
    });
    alert(`You scored ${score} out of ${questions.length}`);
}

// Call the function with the desired courseId, moduleId, and tabIndex
document.addEventListener('DOMContentLoaded', () => {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    loadQuizData(courseId, moduleId, tabId);
});

// Add a function to check if all questions are answered
function areAllQuestionsAnswered(questions) {
    for (let i = 0; i < questions.length; i++) {
        const selectedOption = document.querySelector(`input[name="question-${i}"]:checked`);
        if (!selectedOption) {
            return false;
        }
    }
    return true;
}

// Modify the markTabCompleteAndGoNext function
async function markTabCompleteAndGoNext() {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    const userId = currentUser.uid;
    const enrollmentRef = doc(db, 'enrollments', userId);

    try {
        // Fetch enrollment and course data
        const [enrollmentSnapshot, courseSnapshot] = await Promise.all([
            getDoc(enrollmentRef),
            getDoc(doc(db, 'courses', courseId))
        ]);

        const enrollmentData = enrollmentSnapshot.data();
        const courseData = courseSnapshot.data();
        const currentModule = courseData.modules.find(module => module.id === moduleId);
        const currentTab = currentModule.tabs.find(tab => tab.id === tabId);

        // If it's a quiz, check if all questions are answered
        if (currentTab.type === "Quiz") {
            const questions = currentTab.content.questions;
            
            if (!areAllQuestionsAnswered(questions)) {
                showPopup({
                    title: "Incomplete Quiz",
                    message: "Please answer all questions before proceeding.",
                    type: "warning",
                    showCancel: false
                });
                return;
            }

            const score = calculateQuizScore(questions);
            if (score === -1) {
                showPopup({
                    title: "Incomplete Quiz",
                    message: "Please answer all questions before proceeding.",
                    type: "warning",
                    showCancel: false
                });
                return;
            }

            // Show quiz results before proceeding
            showPopup({
                title: "Quiz Results",
                message: `You scored ${score}% on this quiz!`,
                type: "success",
                showCancel: false,
                onConfirm: async () => {
                    // Continue with marking the tab complete and navigation
                    const courseEnrollment = enrollmentData[`courseId_${courseId}`];
                    courseEnrollment.progress.modules[moduleId].tabs[tabId].completed = true;
                    courseEnrollment.progress.modules[moduleId].tabs[tabId].score = score;

                    await setDoc(enrollmentRef, enrollmentData, { merge: true });
                    await handleModuleCompletion(courseEnrollment, moduleId, userId, courseId, courseData, tabId);
                }
            });
        } else {
            // For non-quiz tabs, proceed normally
            const courseEnrollment = enrollmentData[`courseId_${courseId}`];
            courseEnrollment.progress.modules[moduleId].tabs[tabId].completed = true;
            await setDoc(enrollmentRef, enrollmentData, { merge: true });
            await handleModuleCompletion(courseEnrollment, moduleId, userId, courseId, courseData, tabId);
        }
    } catch (error) {
        console.error("Error in markTabCompleteAndGoNext:", error);
        showPopup({
            title: "Error",
            message: "An error occurred. Please try again.",
            type: "error",
            showCancel: false
        });
    }
}

// Add a helper function to handle module completion logic
async function handleModuleCompletion(courseEnrollment, moduleId, userId, courseId, courseData, tabId) {
    const isModuleCompleted = checkIfModuleCompleted(courseEnrollment.progress.modules[moduleId]);
    if (isModuleCompleted) {
        courseEnrollment.progress.modules[moduleId].completed = true;
        const isCourseCompleted = checkIfCourseCompleted(courseEnrollment.progress.modules);

        if (isCourseCompleted) {
            await generateDigitalBadge(userId, courseId, courseData);
            showPopup({
                title: "Congratulations!",
                message: "You have completed the course and earned a badge!",
                type: "success",
                showCancel: false,
                onConfirm: async () => {
                    await saveStudyTime();
                    window.location.href = `/user/dashboard`;
                }
            });
            return;
        }
    }

    // Navigate to next tab if course is not completed
    await goToNextTab(courseId, moduleId, tabId);
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
    const badgeData = {
        badgeId: `${userId}_${courseId}`,
        userId: userId,
        courseId: courseId,
        badgeIssuedOn: new Date().toISOString(),
        badgeType: "Course Completion",
        badgeUrl: courseData.badgeUrl,
        title: `${courseData.title} Completion`,
        description: `Awarded for successfully completing the ${courseData.title} course.`,
        skills: [courseData.category],
        courseDescription: courseData.description
    };

    // Store the badge information in the Firestore 'badges' collection
    const badgeRef = doc(db, 'badges', `${userId}_${courseId}`);
    await setDoc(badgeRef, badgeData);
}

// Function to navigate to the next tab or module
async function goToNextTab(courseId, moduleId, currentTabId) {
    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnapshot = await getDoc(courseRef);
        const courseData = courseSnapshot.data();
        const module = courseData.modules.find(mod => mod.id === moduleId);

        const sortedTabs = module.tabs;
        const currentTabIndex = sortedTabs.findIndex(tab => tab.id === currentTabId);

        if (currentTabIndex !== -1 && currentTabIndex < sortedTabs.length - 1) {
            // Navigate to the next tab within the same module
            const nextTab = sortedTabs[currentTabIndex + 1];
            const newUrl = `/user/${nextTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${moduleId}&tabId=${nextTab.id}`;
            await saveStudyTime();
            window.location.href = newUrl;
        } else {
            console.log("No more tabs in the current module.");
            const currentModuleIndex = courseData.modules.findIndex(mod => mod.id === moduleId);

            if (currentModuleIndex !== -1 && currentModuleIndex < courseData.modules.length - 1) {
                // Navigate to the first tab of the next module
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

// Function to calculate the quiz score
function calculateQuizScore(questions) {
    let score = 0;
    let totalScore = questions.length;

    // First verify all questions are answered
    for (let i = 0; i < questions.length; i++) {
        const selectedOption = document.querySelector(`input[name="question-${i}"]:checked`);
        if (!selectedOption) {
            return -1; // Return -1 if any question is unanswered
        }
    }

    // Calculate score only if all questions are answered
    questions.forEach((question, index) => {
        const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
        const selectedIndex = Array.from(selectedOption.parentElement.parentElement.children).indexOf(selectedOption.parentElement);
        const correctIndex = parseInt(question.correctAnswer.split(' ')[1]) - 1;
        if (selectedIndex === correctIndex) {
            score++;
        }
    });

    return (score / totalScore) * 100;  // Return the percentage score
}

// Update the next button click handler
document.getElementById("next-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    await markTabCompleteAndGoNext();
});