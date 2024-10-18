import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

async function loadQuizData(courseId, moduleId, tabIndex) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            
            if (moduleData && moduleData.tabs[tabIndex] && moduleData.tabs[tabIndex].type === 'Quiz') {
                const quizTab = moduleData.tabs[tabIndex];
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

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.className = 'submit-button';
    submitButton.addEventListener('click', () => checkAnswers(questions));
    quizContainer.appendChild(submitButton);
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
    const courseId = 'ixaNC7kEZoAi5mOjQpvC'; // Replace with the actual courseId
    const moduleId = 'module-1'; // Replace with the actual moduleId
    const tabIndex = 1; // Replace with the actual index of the quiz tab
    loadQuizData(courseId, moduleId, tabIndex);
});
