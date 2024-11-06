import { auth, db } from './firebase-config.js';
import { doc, collection, query, where, getDoc, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function
import { showPopup } from './popup.js';

let userId = null;

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

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User is logged in:', user);
        // Once the user is confirmed as logged in, proceed with checking enrollment
        checkUserEnrollmentAndCalculateProgress(user);
        const sessions = await fetchStudyData(user);  // Pass user ID to fetch data
        const timeSpentByDay = calculateTimeSpent(sessions);
        generateGraph(timeSpentByDay);
        await populateCourses(user.uid);
        userId = user.uid;
        const courseSelect = document.getElementById('course-select');
        const selectedCourseId = courseSelect.value;
        console.log('sc', selectedCourseId);
        updateAssessmentMarks(selectedCourseId, userId); // Call function directly
    } else {
        console.log('No user is logged in.');
        // Redirect to the login page if no user is logged in
        window.location.href = '/';
    }
});

// Function to check user enrollment and display the most recent course
async function checkUserEnrollmentAndCalculateProgress(user) {
    const userId = user.uid;

    // Reference to the enrollment document using the userId as the document ID
    const enrollmentRef = doc(db, 'enrollments', userId);

    try {
        // Fetch the enrollment document for the current user
        const enrollmentSnapshot = await getDoc(enrollmentRef);

        // Check if the user has any enrollments
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
        let mostRecentCourse = null;

        // Loop through all enrolled courses
        for (const courseKey of Object.keys(enrollmentData)) {
            const courseEnrollment = enrollmentData[courseKey];
            const lastStudyTime = courseEnrollment.progress?.lastStudyTime || courseEnrollment.enrolledOn;

            // Compare with the current most recent course
            if (!mostRecentCourse || new Date(lastStudyTime) > new Date(mostRecentCourse.lastStudyTime)) {
                // Store the course details for the most recent course
                mostRecentCourse = {
                    courseId: courseKey.replace('courseId_', ''),  // Remove the `courseId_` prefix to get the actual course ID
                    lastStudyTime: lastStudyTime,
                    progress: courseEnrollment.progress
                };
            }
        }

        // If we found the most recent course, fetch its details from the courses collection
        if (mostRecentCourse) {
            console.log(mostRecentCourse);
            const courseId = mostRecentCourse.courseId;
            const moduleId = getFirstIncompleteModuleId(mostRecentCourse);
            

            // Fetch the course details using the courseId
            const courseRef = doc(db, 'courses', courseId);
            const courseSnapshot = await getDoc(courseRef);

            if (courseSnapshot.exists()) {
                const courseData = courseSnapshot.data();
                console.log(courseData);
                const moduleTitle = getModuleTitle(courseData, moduleId);
                mostRecentCourse.courseName = courseData.title || "Unknown Course";  // Assuming `courseName` is in the course document
                mostRecentCourse.currentModule = moduleTitle || "Unknown Module";  // Assuming `currentModule` is in the course document

                // Now that we have the course details, display them
                displayRecentCourse(mostRecentCourse);
            } else {
                console.error('Course details not found in courses collection.');
            }
        }

    } catch (error) {
        console.error("Error fetching enrollments or calculating progress:", error);
    }
}

// Function to display the most recent course and update the progress bar
function displayRecentCourse(course) {
    const courseTitleElement = document.getElementById('course-title');
    const courseModuleElement = document.getElementById('course-module');

    if (courseTitleElement && courseModuleElement) {
        courseTitleElement.textContent = `Recently Course: ${course.courseName}`;
        courseModuleElement.textContent = `Current Module: ${course.currentModule}`;
    } else {
        console.error("Course title or module elements not found in the DOM.");
    }

    // Ensure progress data exists
    const percentage = course.progress ? calculateProgressPercentage(course.progress) : 0;
    updateProgressBar(percentage);
}

// Function to calculate progress percentage
function calculateProgressPercentage(progress) {
    let totalTabs = 0;
    let completedTabs = 0;

    // Loop through each module and tab
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

    const percentage = (completedTabs / totalTabs) * 100;
    return percentage;
}

// Function to update the progress bar (already provided)
function updateProgressBar(percentage) {
    const progressBar = document.querySelector('.progress');
    const tooltip = document.querySelector('.tooltip');
    const icons = document.querySelectorAll('.icon');

    // Set the width of the progress bar
    progressBar.style.width = `${percentage}%`;

    // Update the tooltip text and position
    tooltip.textContent = `${percentage}%`;
    tooltip.style.left = `calc(${percentage}% - 15px)`; // Center the tooltip

    // Set icon states based on progress
    icons.forEach((icon, index) => {
        const iconPosition = index * (100 / (icons.length - 1));
        const img = icon.querySelector('img');

        // Apply filled state to icons as needed
        if (percentage >= iconPosition) {
            icon.classList.add('filled');
            img.src = img.src.replace('Bef', 'Aft');
        } else {
            icon.classList.remove('filled');
            img.src = img.src.replace('Aft', 'Bef');
        }
    });
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

function getFirstIncompleteModuleId(enrollmentData) {
    // Ensure that progress and modules exist before proceeding
    let lastModuleId = '';
    if (!enrollmentData || !enrollmentData.progress || !enrollmentData.progress.modules) {
        console.error("No modules found in enrollment data.");
        return null;
    }

    // Loop through the modules in the progress data
    for (let moduleId in enrollmentData.progress.modules) {
        const module = enrollmentData.progress.modules[moduleId];
        lastModuleId = moduleId;

        // Check if the module is not completed
        if (module.completed === false) {
            return moduleId;  // Return the module ID
        }
    }

    // If all modules are completed, return null or some other indication
    return lastModuleId;
}

// Function to fetch time spent data from Firestore
async function fetchStudyData(user) {
    const userId = user.uid;
    console.log(userId);
    try {
        const userDocRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            const sessions = userData.sessions;
            return sessions || [];  // Return the sessions array or an empty array if undefined
        } else {
            console.error("No such document!");
            return [];
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return [];
    }
}

function calculateTimeSpent(sessions) {
    const timeSpentByDay = {
        Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
    };

    sessions.forEach(session => {
        const date = new Date(session.date);
        const day = date.getDay();  // 0: Sun, 1: Mon, ..., 6: Sat
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = daysOfWeek[day];

        timeSpentByDay[dayName] += session.timeSpent / 3600;  // Convert from seconds to hours
    });

    return timeSpentByDay;
}

function generateGraph(timeSpentByDay) {
    const chart = document.getElementById('chart');
    chart.innerHTML = '';  // Clear existing bars

    const maxTime = Math.max(...Object.values(timeSpentByDay));  // Get the max time to scale the bars

    for (const [day, timeSpent] of Object.entries(timeSpentByDay)) {
        const barHeight = (timeSpent / maxTime) * 200;  // Scale the bar heights to a maximum of 200px

        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';
        barContainer.style.position = 'relative';  // Relative positioning for tooltip

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = barHeight + 'px';

        // Tooltip showing time spent
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerText = `${timeSpent.toFixed(2)} hours`;

        const dayLabel = document.createElement('div');
        dayLabel.className = 'days';
        dayLabel.innerText = day;

        barContainer.appendChild(bar);
        barContainer.appendChild(tooltip);
        barContainer.appendChild(dayLabel);
        chart.appendChild(barContainer);

        // Event listeners to move tooltip with the mouse inside the bar container
        barContainer.addEventListener('mousemove', (e) => {
            const containerRect = barContainer.getBoundingClientRect();
            tooltip.style.left = `${e.clientX - containerRect.left + 10}px`;  // Adjust tooltip X relative to bar container
            tooltip.style.top = `${e.clientY - containerRect.top + 10}px`;  // Adjust tooltip Y relative to bar container
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });

        barContainer.addEventListener('mouseleave', () => {
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
    }
}

async function populateCourses(userId) {
    const courseSelect = document.getElementById('course-select');
    
    const userRef = doc(db, 'enrollments', userId);
    const docSnapshot = await getDoc(userRef);

    if (docSnapshot.exists()) {
        const enrolledCourses = docSnapshot.data();
        
        for (const courseId in enrolledCourses) {
            const actualCourseId = courseId.replace('courseId_', '');  // Extract the actual courseId (optional)

            const courseRef = doc(db, 'courses', actualCourseId);
            const courseSnapshot = await getDoc(courseRef);
            
            if (courseSnapshot.exists()) {
                const courseData = courseSnapshot.data();
                const courseTitle = courseData.title || "Unknown Course";  // Use 'Unknown Course' if the title is not available

                const option = document.createElement('option');
                option.value = actualCourseId;
                option.textContent = courseTitle;
                courseSelect.appendChild(option);
            } else {
                console.error(`Course with ID ${actualCourseId} not found in courses collection.`);
            }
        }
    } else {
        console.log('No enrollment data found.');
    }
}

function updateAssessmentMarks(courseId, userId) {
    const percentageElement = document.getElementById('percentage');
    
    // Reference the enrollment document for the user
    const courseRef = doc(db, 'enrollments', userId);
    getDoc(courseRef).then((courseSnapshot) => {
        if (courseSnapshot.exists()) {
            const courseData = courseSnapshot.data();
            const courseEnrollment = courseData['courseId_' + courseId];  // Get the specific course by courseId
            
            if (courseEnrollment && courseEnrollment.progress) {
                const progress = courseEnrollment.progress;
                let totalScore = 0;
                let quizCount = 0;  // To count the number of quiz tabs
                
                // Iterate through modules and tabs to find quiz scores
                for (const moduleId in progress.modules) {
                    const module = progress.modules[moduleId];
                    
                    for (const tabId in module.tabs) {
                        const tab = module.tabs[tabId];
                        
                        if (tab.score !== undefined) {  // Assuming `score` field is used for quiz scores
                            totalScore += tab.score;
                            quizCount++;  // Increment count of quiz tabs
                        }
                    }
                }

                // Calculate the average quiz score if there are quiz tabs
                const averageScore = quizCount > 0 ? (totalScore / quizCount) : 0;
                
                // Update the percentage element and the circle visualization
                percentageElement.textContent = `${averageScore.toFixed(2)}%`;
                updateCircle(averageScore);  // Update the circle visualization
            } else {
                console.error('No progress found for the selected course.');
            }
        } else {
            console.error('Course enrollment not found in database.');
        }
    }).catch((error) => {
        console.error('Error fetching course enrollment:', error);
    });
}

function updateCircle(percentage) {
    const circle = document.querySelector('.circle');
    const filledPercentage = percentage;
    const unfilledPercentage = 100 - percentage;

    // Update the conic gradient dynamically based on the percentage
    circle.style.background = `conic-gradient(#FFC700 0% ${filledPercentage}%, #97ADFD ${filledPercentage}% 100%)`;
}

// Listen for course selection change
document.getElementById('course-select').addEventListener('change', (event) => {
    const selectedCourseId = event.target.value;
    updateAssessmentMarks(selectedCourseId, userId);
});

