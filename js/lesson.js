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

function displayLessonContent(courseTitle, moduleTitle, lessonTab, lessonCategory) {
    // Update module info
    document.querySelector('.module-info h2').textContent = courseTitle;
    document.querySelector('.module-info h3').textContent = 'Module: ' + moduleTitle;
    document.querySelector('.module-info h4').textContent = lessonTab.content.title;
    document.querySelector('.module-info p').innerHTML = lessonTab.content.description;

    // Update instructions
    const instructionsList = document.querySelector('.instructions ol');
    instructionsList.innerHTML = ''; // Clear existing instructions
    lessonTab.content.steps.forEach(step => {
        const stepItem = document.createElement('li');
        stepItem.textContent = step.instruction;
        instructionsList.appendChild(stepItem);
    });
    let aceMode = "";
    if (lessonCategory === "Python"){
        aceMode = "ace/mode/python";
    } else if (lessonCategory === "Java"){
        aceMode = "ace/mode/java";
    } else if (lessonCategory === "C++"){
        aceMode = "ace/mode/c_cpp";
    }

    // Update Ace Editor with default code
    const editor = ace.edit("editor");
    editor.session.setMode(aceMode);
    editor.setValue(lessonTab.content.defaultCode, -1); // -1 to move cursor to start
}

// Call the function with the desired courseId, moduleId, and tabIndex
document.addEventListener('DOMContentLoaded', () => {
    const courseId = 'ixaNC7kEZoAi5mOjQpvC'; // Replace with the actual courseId
    const moduleId = 'module-1'; // Replace with the actual moduleId
    const tabIndex = 2; // Replace with the actual index of the lesson tab
    loadLessonData(courseId, moduleId, tabIndex);
});
