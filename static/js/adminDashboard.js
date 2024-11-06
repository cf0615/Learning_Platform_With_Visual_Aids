import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { showPopup, hidePopup } from './popup.js';

// Fetch users and their enrollments, then update the dashboard
async function getDashboardData() {
    // Show loading popup when starting to fetch data
    showPopup({
        title: "Loading Dashboard",
        message: "Please wait while we fetch the data...",
        type: "loading"
    });

    try {
        console.log("Fetching users from Firebase...");
        const userQuery = query(collection(db, 'users'), where('role', '==', 'user'));
        const userDocs = await getDocs(userQuery);

        const users = userDocs.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        console.log("Fetched users:", users);

        // Fetch all enrollments
        const enrollmentsQuery = collection(db, 'enrollments');
        const enrollmentsDocs = await getDocs(enrollmentsQuery);

        const enrollments = enrollmentsDocs.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        console.log("Fetched enrollments data:", enrollments);

        // Update both the course stats and new user chart
        updateDashboard(users, enrollments);
        displayNewUserData(users);

        // Hide loading popup after data is loaded
        hidePopup();
    } catch (error) {
        console.error("Error loading dashboard:", error);
        // Show error popup if something goes wrong
        hidePopup();
        showPopup({
            title: "Error",
            message: "Failed to load dashboard data. Please try again.",
            type: "error"
        });
    }
}

// Update the dashboard with top courses data
async function updateDashboard(users, enrollments) {
    try {
        const coursesData = await getCoursesData();
        console.log("Fetched courses data:", coursesData);

        // Initialize courseStats
        const courseStats = {};
        
        // Process enrollments
        enrollments.forEach(enrollment => {
            // Get all courseId keys from the enrollment
            Object.keys(enrollment).forEach(key => {
                if (!key.startsWith('courseId_')) return;
                
                const courseId = key.replace('courseId_', '');
                if (!coursesData[courseId]) return;
                
                // Initialize course stats if not exists
                if (!courseStats[courseId]) {
                    courseStats[courseId] = {
                        title: coursesData[courseId].title || 'Unknown Course',
                        totalEnrollments: 0,
                        completedEnrollments: 0
                    };
                }
                
                // Count enrollment
                courseStats[courseId].totalEnrollments++;
                
                // Check completion
                const progress = enrollment[key].progress;
                if (progress && progress.modules) {
                    const isCompleted = Object.values(progress.modules)
                        .every(module => module.completed === true);
                    if (isCompleted) {
                        courseStats[courseId].completedEnrollments++;
                    }
                }
            });
        });

        // Calculate popularity percentages
        const totalEnrollments = Object.values(courseStats)
            .reduce((sum, course) => sum + course.totalEnrollments, 0);

        Object.values(courseStats).forEach(course => {
            course.popularity = ((course.totalEnrollments / totalEnrollments) * 100).toFixed(1);
        });

        displayTopCourses(courseStats);
    } catch (error) {
        console.error("Error in updateDashboard:", error);
    }
}

// Fetch course data
async function getCoursesData() {
    try {
        const courseDocs = await getDocs(collection(db, 'courses'));
        const courses = {};
        courseDocs.docs.forEach(doc => {
            courses[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        console.log("Fetched courses:", courses);
        return courses;
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
}

// Display top courses based on popularity and completion rate
function displayTopCourses(courseStats) {
    const topCoursesContainer = document.querySelector('#top-courses');
    topCoursesContainer.innerHTML = `
        <h2>Top Course</h2>
        <div class="course-header">
            <div class="course-col">#</div>
            <div class="course-col">Name</div>
            <div class="course-col">Popularity</div>
            <div class="course-col">Completion</div>
        </div>
    `;

    // Sort and filter courses
    const sortedCourses = Object.entries(courseStats)
        .filter(([_, course]) => course.totalEnrollments > 0)
        .sort((a, b) => b[1].totalEnrollments - a[1].totalEnrollments)
        .slice(0, 3);

    // Display courses
    sortedCourses.forEach(([_, course], index) => {
        const completionRate = ((course.completedEnrollments / course.totalEnrollments) * 100 || 0).toFixed(0);
        
        const courseElement = document.createElement('div');
        courseElement.className = 'course-row';
        courseElement.innerHTML = `
            <div class="course-col">${String(index + 1).padStart(2, '0')}</div>
            <div class="course-col">${course.title}</div>
            <div class="course-col">
                <div class="popularity-bar">
                    <div class="popularity-fill" style="width: ${course.popularity}%"></div>
                </div>
            </div>
            <div class="course-col">
                <span class="completion-rate">${completionRate}%</span>
            </div>
        `;
        topCoursesContainer.appendChild(courseElement);
    });
}

// Display new user data (for the New Users chart)
function displayNewUserData(users) {
    const newUserCounts = {};
    
    // Get the current month and previous 5 months
    const dates = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Include current month in the range
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const dateStr = `${monthName} ${date.getFullYear()}`;
        dates.push(dateStr);
        newUserCounts[dateStr] = 0;
    }

    // Count users by month
    users.forEach(user => {
        if (user.createdAt && user.createdAt.seconds) {
            const createdAt = new Date(user.createdAt.seconds * 1000);
            const monthStr = `${createdAt.toLocaleString('default', { month: 'short' })} ${createdAt.getFullYear()}`;
            if (newUserCounts[monthStr] !== undefined) {
                newUserCounts[monthStr]++;
            }
        }
    });

    // Convert to data points
    const dataPoints = dates.map(date => ({
        x: date,
        y: newUserCounts[date]
    }));

    renderNewUserChart(dataPoints);
}

let newUserChart;

// Render the "New Users" line chart without using date adapters
function renderNewUserChart(dataPoints) {
    const ctx = document.getElementById('new-user-chart').getContext('2d');

    if (newUserChart) {
        newUserChart.destroy();
    }

    newUserChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map(point => point.x),
            datasets: [{
                label: 'New Users',
                data: dataPoints.map(point => point.y),
                fill: {
                    target: 'origin',
                    above: 'rgba(74, 144, 226, 0.1)'
                },
                borderColor: '#4a90e2',
                backgroundColor: '#4a90e2',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#4a90e2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#4a90e2',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#666'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f0f0f0'
                    },
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 12
                        },
                        color: '#666'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#333',
                    bodyColor: '#333',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `New Users: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Call the main function to load data on page load
getDashboardData();
