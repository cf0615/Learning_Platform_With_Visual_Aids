import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

async function loadLessonData(courseId, moduleId, tabIndex) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            const lessonCategory = courseData.category;
            console.log(moduleData);

            if (moduleData && moduleData.tabs[tabIndex] && moduleData.tabs[tabIndex].type === 'Lesson') {
                const lessonTab = moduleData.tabs[tabIndex];
                displayLessonContent(courseTitle, moduleTitle, lessonTab, lessonCategory);
            } else {
                console.error('Lesson tab not found');
            }
        } else {
            console.error('Course not found');
        }
    } catch (error) {
        console.error('Error loading lesson data:', error);
    }
}

async function loadArticleData(courseId, moduleId, tabIndex) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            
            if (moduleData && moduleData.tabs[tabIndex] && moduleData.tabs[tabIndex].type === 'Article') {
                const articleTab = moduleData.tabs[tabIndex];
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
    const courseId = 'ixaNC7kEZoAi5mOjQpvC'; // Replace with the actual courseId
    const moduleId = 'module-1'; // Replace with the actual moduleId
    const tabIndex = 0; // Replace with the actual index of the lesson tab
    loadArticleData(courseId, moduleId, tabIndex);
});

