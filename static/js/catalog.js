import { db, auth } from './firebase-config.js';
import { doc, getDocs, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
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
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', handleNavigation);
});

// Wrap the displayCourses call in auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User logged in:', user.uid);
        await displayCourses();
    } else {
        console.log('No user logged in');
        window.location.href = '/'; // Redirect to login page if not logged in
    }
});

// Modify fetchCourses to add more logging
async function fetchCourses() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in in fetchCourses");
        return [];
    }

    try {
        // First, get the user's enrollments
        const enrollmentRef = doc(db, 'enrollments', user.uid);
        const enrollmentDoc = await getDoc(enrollmentRef);
        
        // Get enrolled course IDs, handling the nested structure
        let enrolledCourses = [];
        if (enrollmentDoc.exists()) {
            const enrollmentData = enrollmentDoc.data();
            console.log('Raw enrollment data:', enrollmentData);
            
            enrolledCourses = Object.keys(enrollmentData)
                .filter(key => key.startsWith('courseId_'))
                .map(key => key.replace('courseId_', ''));
            console.log('Enrolled courses:', enrolledCourses);
        } else {
            console.log('No enrollment document exists for user:', user.uid);
        }

        // Then fetch all courses
        const coursesCol = collection(db, 'courses');
        const courseSnapshot = await getDocs(coursesCol);
        const allCourses = courseSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Course:', doc.id, data.isPublished);
            return {
                uid: doc.id,
                ...data
            };
        });

        // Filter out enrolled and unpublished courses
        const availableCourses = allCourses.filter(course => {
            const isPublished = course.isPublished === true;
            const isNotEnrolled = !enrolledCourses.includes(course.uid);
            console.log(`Course ${course.uid}: published=${isPublished}, notEnrolled=${isNotEnrolled}`);
            return isPublished && isNotEnrolled;
        });

        console.log('Available courses:', availableCourses);
        return availableCourses;
    } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
    }
}

// Update the displayCourses function to handle empty course list
async function displayCourses() {
    const courses = await fetchCourses();
    const cardContainer = document.querySelector('.card-container');
    cardContainer.innerHTML = ''; // Clear existing content

    if (courses.length === 0) {
        // Display a message when no courses are available
        const messageDiv = document.createElement('div');
        messageDiv.className = 'no-courses-message';
        messageDiv.innerHTML = `
            <p>No available courses to display.</p>
            <p>You might have enrolled in all available courses.</p>
        `;
        cardContainer.appendChild(messageDiv);
        return;
    }

    // Display available courses
    courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'card';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `<i class="fas fa-code"></i> ${course.title}`;

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        cardBody.innerHTML = `<p>${course.description}</p>`;

        const editButtonContainer = document.createElement('div');
        editButtonContainer.className = 'edit-btn-container';

        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = 'Enroll <i class="fas fa-pencil-alt"></i>';
        editButton.addEventListener('click', () => {
            enrollCourse(course.uid);
        });

        editButtonContainer.appendChild(editButton);
        
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        card.appendChild(editButtonContainer);

        cardContainer.appendChild(card);
    });
}

async function enrollCourse(courseId) {
    const user = auth.currentUser;
    if (!user) {
        showPopup({
            title: "Error",
            message: "Please log in to enroll in courses.",
            type: "error"
        });
        return;
    }

    // Show loading popup while enrolling
    showPopup({
        title: "Enrolling",
        message: "Please wait while we process your enrollment...",
        type: "loading"
    });

    const userId = user.uid;
    const enrolledOn = new Date().toISOString();

    try {
        // Fetch the course structure to initialize progress
        const courseRef = doc(db, 'courses', courseId);
        const courseSnapshot = await getDoc(courseRef);

        if (!courseSnapshot.exists()) {
            showPopup({
                title: "Error",
                message: "Course not found. Please try again later.",
                type: "error"
            });
            return;
        }

        const courseData = courseSnapshot.data();
        const initialProgress = {
            modules: {}
        };

        // Initialize progress for each module and tab
        courseData.modules.forEach(module => {
            const moduleId = module.id;
            initialProgress.modules[moduleId] = {
                tabs: {},
                completed: false
            };

            module.tabs.forEach(tab => {
                const tabData = { completed: false };
                if (tab.type === 'Quiz') {
                    tabData.score = null;
                }
                initialProgress.modules[moduleId].tabs[tab.id] = tabData;
            });
        });

        const courseEnrollmentData = {
            enrolledOn: enrolledOn,
            progress: initialProgress
        };

        const enrollmentRef = doc(db, 'enrollments', `${userId}`);
        await setDoc(enrollmentRef, {
            [`courseId_${courseId}`]: courseEnrollmentData
        }, { merge: true });

        // Show success popup
        showPopup({
            title: "Success!",
            message: "You have successfully enrolled in the course.",
            type: "success",
            onConfirm: () => {
                // Redirect to my courses page after successful enrollment
                window.location.href = '/user/mycourse';
            }
        });

    } catch (error) {
        console.error("Error enrolling in course:", error);
        
        // Show error popup with specific message
        showPopup({
            title: "Enrollment Failed",
            message: "There was an error enrolling in the course. Please try again later.",
            type: "error"
        });
    }
}