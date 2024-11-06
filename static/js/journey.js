import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function

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

// Function to fetch and render badges
async function fetchAndRenderBadges() {
    const user = auth.currentUser;
    
    if (!user) {
        console.log("No user logged in.");
        return;
    }
    
    const userId = user.uid;

    // Query the 'badges' collection for the current user
    const badgesRef = collection(db, 'badges');
    const q = query(badgesRef, where('userId', '==', userId));

    try {
        const querySnapshot = await getDocs(q);
        const badgeBox = document.getElementById('badge-box');
        badgeBox.innerHTML = '';  // Clear the current badge display

        if (querySnapshot.empty) {
            badgeBox.innerHTML = '<p>No badges earned yet.</p>';
            return;
        }

        // Loop through each badge document and render it in the badge box
        querySnapshot.forEach((doc) => {
            const badgeData = doc.data();

            // Create a div for each badge
            const badgeElement = document.createElement('div');
            badgeElement.classList.add('badge');
            badgeElement.style.cursor = 'pointer';  // Set cursor to pointer for clickable badges

            // Create an img element for the badge
            const badgeImage = document.createElement('img');
            badgeImage.src = badgeData.badgeUrl;  // Use badgeUrl from Firestore
            badgeImage.alt = badgeData.badgeType; // Use badgeType as alt text

            // Create a title element for the badge
            const badgeTitle = document.createElement('p');
            badgeTitle.classList.add('badge-title');
            badgeTitle.innerText = badgeData.title; // Use the title from Firestore

            // Append the badge image and title to the badge div
            badgeElement.appendChild(badgeImage);
            badgeElement.appendChild(badgeTitle);

            // Add a click event to show more details
            badgeElement.addEventListener('click', () => {
                showBadgeDetails(badgeData);
            });

            // Append the badge div to the badge-box container
            badgeBox.appendChild(badgeElement);
        });
    } catch (error) {
        console.error("Error fetching badges: ", error);
    }
}

// Function to show badge details in a modal or a dedicated details section
function showBadgeDetails(badgeData) {
    const badgeDetailsBox = document.getElementById('badge-details');
    badgeDetailsBox.innerHTML = ''; // Clear existing content

    // Badge title
    const titleElement = document.createElement('h3');
    titleElement.innerText = badgeData.title;

    // Badge image
    const imageElement = document.createElement('img');
    imageElement.src = badgeData.badgeUrl;
    imageElement.alt = badgeData.badgeType;

    // Badge description
    const descriptionElement = document.createElement('p');
    descriptionElement.innerText = badgeData.description;

    // Skills
    const skillsElement = document.createElement('p');
    skillsElement.innerHTML = `<strong>Skills:</strong> ${badgeData.skills.join(', ')}`;

    // Badge issued date
    const issuedDateElement = document.createElement('p');
    issuedDateElement.innerHTML = `<strong>Issued On:</strong> ${new Date(badgeData.badgeIssuedOn).toLocaleDateString()}`;

    // Course description
    const courseDescriptionElement = document.createElement('p');
    courseDescriptionElement.innerHTML = `<strong>Course Description:</strong> ${badgeData.courseDescription}`;

    // Append all elements to the badge details box
    badgeDetailsBox.appendChild(titleElement);
    badgeDetailsBox.appendChild(imageElement);
    badgeDetailsBox.appendChild(descriptionElement);
    badgeDetailsBox.appendChild(skillsElement);
    badgeDetailsBox.appendChild(issuedDateElement);
    badgeDetailsBox.appendChild(courseDescriptionElement);

    // Display the badge details box (you may toggle visibility or use a modal)
    badgeDetailsBox.style.display = 'block';
}

// Call the function when the page loads
auth.onAuthStateChanged(async user => {
    if (user) {
        userId = user.uid;
        fetchAndRenderBadges();
        const sessions = await fetchStudyData(user);  // Pass user ID to fetch data
        const timeSpentByDay = calculateTimeSpent(sessions);
        generateGraph(timeSpentByDay);
        calculateCourseProgress();
        calculateLearningMetrics();
        generateUserCalendar(user);
    } else {
        console.log("User not logged in");
        window.location.href = '/login'; // Redirect to login page
    }
});

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

async function calculateCourseProgress() {
    try {
        const userEnrollmentsRef = doc(db, "enrollments", userId); // Reference to the user's enrollment document
        const userEnrollmentsSnapshot = await getDoc(userEnrollmentsRef);

        let completedCourses = 0;
        let inProgressCourses = 0;

        if (userEnrollmentsSnapshot.exists()) {
            const enrollmentData = userEnrollmentsSnapshot.data();
            let hasCourses = false;

            // Loop through each course under the userId document
            for (const [courseKey, courseData] of Object.entries(enrollmentData)) {
                if (courseKey.startsWith("courseId_")) { // Filter only course entries
                    hasCourses = true;
                    const modules = courseData.progress.modules;

                    // Check if the course is completed
                    if (checkIfCourseCompleted(modules)) {
                        completedCourses += 1;
                    } else {
                        inProgressCourses += 1;
                    }
                }
            }

            const courseInProgress = document.getElementById('course-in-progress');
            const courseCompleted = document.getElementById('course-completed');

            // Check if there were any courses; if not, set counts to zero
            if (!hasCourses) {
                courseInProgress.innerHTML = inProgressCourses;
                courseCompleted.innerHTML = completedCourses;
            } else {
                courseInProgress.innerHTML = inProgressCourses;
                courseCompleted.innerHTML = completedCourses;
            }

        } else {
            console.log(`No enrollment data found for user: ${userId}`);
        }

    } catch (error) {
        console.error("Error fetching enrollment data:", error.message);
    }
}

// Helper function to check if a course is completed
function checkIfCourseCompleted(modules) {
    for (let moduleId in modules) {
        if (!modules[moduleId].completed) {
            return false; // Incomplete module found
        }
    }
    return true; // All modules are completed
}

async function calculateLearningMetrics() {
    try {
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
            console.log(`No user data found for userId: ${userId}`);
            return;
        }

        const userData = userSnapshot.data();
        const sessions = userData.sessions || [];
        const totalStudyTime = userData.totalStudyTime || 0;

        // Calculate total learning time in hours and minutes
        const hoursLearning = Math.floor(totalStudyTime / 3600);
        const minutesLearning = Math.floor((totalStudyTime % 3600) / 60);

        // Calculate learning streak
        let streak = 1;
        let maxStreak = 1;

        // Sort session dates in ascending order
        const sessionDates = sessions
            .map(session => new Date(session.date))
            .sort((a, b) => a - b);

        for (let i = 1; i < sessionDates.length; i++) {
            const prevDate = sessionDates[i - 1];
            const currentDate = sessionDates[i];

            // Check if dates are consecutive
            if ((currentDate - prevDate) / (1000 * 60 * 60 * 24) === 1) {
                streak += 1;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1; // Reset streak if not consecutive
            }
        }

        // Log results
        const hoursLearningValue = document.getElementById('hours-learning');
        const learningStreaksValue = document.getElementById('learning-streaks');

        hoursLearningValue.innerHTML = `${hoursLearning}h ${minutesLearning}m`;
        learningStreaksValue.innerHTML = `${maxStreak} days`;    

    } catch (error) {
        console.error("Error fetching learning metrics:", error);
    }
}

// Function to generate the calendar for a specified user
async function generateUserCalendar(user) {
    // Fetch the session data
    const sessions = await fetchStudyData(user);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Set month and year in the header
    document.getElementById('calendar-month-number').innerHTML = String(currentDay).padStart(2, '0');
    document.getElementById('calendar-month-text').innerHTML = `${months[currentMonth]} ${currentYear}`;

    // Get the first day of the month and total days in the month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const calendarDates = document.getElementById('calendar-dates');
    calendarDates.innerHTML = ''; // Clear previous dates

    // Extract attendance days from sessions, filtering only those in the current month
    const attendedDays = sessions
        .map(session => new Date(session.date))
        .filter(sessionDate => 
            sessionDate.getFullYear() === currentYear &&
            sessionDate.getMonth() === currentMonth
        )
        .map(sessionDate => sessionDate.getDate()); // Only keep the day of the month

    // Add empty divs for the days before the 1st
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-empty');
        calendarDates.appendChild(emptyDiv);
    }

    // Add days of the month and apply highlights
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = day;

        // Highlight today's date
        if (day === currentDay) {
            dayDiv.classList.add('highlighted');
        }

        // Highlight attended days
        if (attendedDays.includes(day)) {
            dayDiv.classList.add('attended-day'); // Add a custom class for attended days
        }

        calendarDates.appendChild(dayDiv);
    }
}