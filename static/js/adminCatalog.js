import { db, auth } from './firebase-config.js';
import { doc, getDocs, setDoc, deleteDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showPopup } from './popup.js';

async function fetchCourses() {
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    const courseList = courseSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
    }));
    return courseList;
}

async function displayCourses() {
    const courses = await fetchCourses();
    const cardContainer = document.querySelector('.card-container');
    cardContainer.innerHTML = '';

    courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'card';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `<i class="fas fa-code"></i> ${course.title}`;

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        cardBody.innerHTML = `<p>${course.description}</p>`;

        // Status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.className = 'status-indicator';
        statusIndicator.textContent = course.isPublished ? 'Published' : 'Unpublished';
        if (!course.isPublished) statusIndicator.classList.add('unpublished');

        // Edit and Delete buttons in footer
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';

        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = 'Edit <i class="fas fa-pencil-alt"></i>';
        editButton.addEventListener('click', () => {
            window.location.href = `/admin/editCourse?courseId=${course.uid}`;
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = 'Delete <i class="fas fa-trash-alt"></i>';
        deleteButton.addEventListener('click', async () => {
            showPopup({
                title: "Confirm Deletion",
                message: `Are you sure you want to delete the course "${course.title}"?`,
                type: "confirm",
                onConfirm: async () => {
                    await deleteDoc(doc(db, 'courses', course.uid));
                    displayCourses(); // Refresh the list after deletion
                }
            });
        });

        // Assemble the card
        cardFooter.appendChild(editButton);
        cardFooter.appendChild(deleteButton);

        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        card.appendChild(statusIndicator);
        card.appendChild(cardFooter);

        cardContainer.appendChild(card);
    });
}

document.getElementById('addCourseBtn').addEventListener('click', () => {
    window.location.href = `/admin/editCourse`;
});

displayCourses();
