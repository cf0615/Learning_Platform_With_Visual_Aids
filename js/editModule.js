import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Initialize Quill editor
const quill = new Quill('#quill-editor', {
    theme: 'snow'
});

// Tab management
const tabsContainer = document.getElementById('editor-tabs');
const editorContent = document.getElementById('editor-content');

let tabs = [];
let activeTab = null;

// Function to update the active tab
function updateActiveTab(newActiveTabId) {
    if (activeTab) {
        // Save current tab data
        saveTabData(activeTab);
    }

    tabs.forEach(tab => {
        tab.button.classList.remove('active');
    });
    const newActiveTab = tabs.find(tab => tab.id === newActiveTabId);
    if (newActiveTab) {
        newActiveTab.button.classList.add('active');
        activeTab = newActiveTab;
        loadEditorContent(newActiveTab);
    }
}

// Function to load editor content based on the selected tab
function loadEditorContent(tab) {
    editorContent.innerHTML = '';
    const contentDiv = document.createElement('div');
    contentDiv.id = tab.contentId;
    contentDiv.style.height = 'auto';
    editorContent.appendChild(contentDiv);

    if (tab.type === 'Article') {
        loadArticleContent(contentDiv, tab);
    } else if (tab.type === 'Lesson') {
        loadLessonContent(contentDiv, tab);
    } else if (tab.type === 'Quiz') {
        loadQuizContent(contentDiv, tab);
    }
}

// Load Article Content
function loadArticleContent(container, tab) {
    tab.data = tab.data || {};
    tab.data.content = tab.data.content || '';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Article Title';
    titleInput.value = tab.data?.title || '';
    titleInput.className = 'input-field';
    container.appendChild(titleInput);

    // Add Content Title
    const contentTitle = document.createElement('h3');
    contentTitle.textContent = 'Content';
    container.appendChild(contentTitle);

    const editorDiv = document.createElement('div');
    editorDiv.style.height = '200px';
    container.appendChild(editorDiv);
    const editor = new Quill(editorDiv, { theme: 'snow' });
    if (tab.data?.content) {
        editor.root.innerHTML = tab.data.content;
    }
    tab.editor = editor;
}

// Load Lesson Content
function loadLessonContent(container, tab) {
    tab.data = tab.data || {};
    tab.data.steps = tab.data.steps || [];

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Lesson Title';
    titleInput.value = tab.data?.title || tab.data.title || '';
    titleInput.className = 'input-field';
    container.appendChild(titleInput);

    // Add Description Title
    const descriptionTitle = document.createElement('h3');
    descriptionTitle.textContent = 'Description';
    container.appendChild(descriptionTitle);

    const descriptionDiv = document.createElement('div');
    descriptionDiv.style.height = '200px';
    container.appendChild(descriptionDiv);
    const descriptionEditor = new Quill(descriptionDiv, { theme: 'snow' });
    if (tab.data?.description) {
        descriptionEditor.root.innerHTML = tab.data.description;
    }
    tab.descriptionEditor = descriptionEditor;

    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps-container';
    container.appendChild(stepsContainer);

    const addStepBtn = document.createElement('button');
    addStepBtn.textContent = 'Add Step';
    addStepBtn.className = 'btn';
    container.appendChild(addStepBtn);

    addStepBtn.addEventListener('click', () => addStep(stepsContainer, tab));

    // Clear and add existing steps
    stepsContainer.innerHTML = '';
    if (tab.data?.steps) {
        tab.data.steps.forEach(step => addStep(stepsContainer, tab, step));
    }

    // Add Default Code Title
    const codeTitle = document.createElement('h3');
    codeTitle.textContent = 'Default Code';
    container.appendChild(codeTitle);

    const editorDiv = document.createElement('div');
    editorDiv.style.height = '200px';
    container.appendChild(editorDiv);
    const editor = ace.edit(editorDiv);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/cpp");
    if (tab.data?.defaultCode) {
        editor.setValue(tab.data.defaultCode);
    }
    tab.aceEditor = editor;
}

function addStep(container, tab, existingStep = null) {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'lesson-step';
    stepDiv.style.marginBottom = '20px';
    container.appendChild(stepDiv);

    const stepTitle = document.createElement('h4');
    stepDiv.appendChild(stepTitle);

    const instructionInput = document.createElement('textarea');
    instructionInput.placeholder = 'Instruction';
    instructionInput.value = existingStep?.instruction || '';
    instructionInput.className = 'input-field';
    instructionInput.style.width = '100%';
    stepDiv.appendChild(instructionInput);

    const requiredConstructsInput = document.createElement('input');
    requiredConstructsInput.type = 'text';
    requiredConstructsInput.placeholder = 'Required Constructs (comma-separated)';
    requiredConstructsInput.value = existingStep?.requiredConstructs?.join(', ') || '';
    requiredConstructsInput.className = 'input-field';
    requiredConstructsInput.style.width = '100%';
    stepDiv.appendChild(requiredConstructsInput);

    const customRulesInput = document.createElement('textarea');
    customRulesInput.placeholder = 'Custom Rules (JSON)';
    customRulesInput.value = existingStep?.customRules ? JSON.stringify(existingStep.customRules, null, 2) : '';
    customRulesInput.className = 'input-field';
    customRulesInput.style.width = '100%';
    stepDiv.appendChild(customRulesInput);

    const expectedOutputInput = document.createElement('textarea');
    expectedOutputInput.placeholder = 'Expected Output';
    expectedOutputInput.value = existingStep?.expectedOutput || '';
    expectedOutputInput.className = 'input-field';
    expectedOutputInput.style.width = '100%';
    stepDiv.appendChild(expectedOutputInput);

    const verifyMethodInput = document.createElement('select');
    verifyMethodInput.className = 'input-field';
    verifyMethodInput.style.width = '100%';
    const verifyMethods = ['Exact Match', 'Contains', 'Regex'];
    verifyMethods.forEach(method => {
        const option = document.createElement('option');
        option.value = method.toLowerCase().replace(' ', '_');
        option.textContent = method;
        verifyMethodInput.appendChild(option);
    });
    verifyMethodInput.value = existingStep?.verifyMethod || 'exact_match';
    stepDiv.appendChild(verifyMethodInput);

    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove Step';
    removeBtn.className = 'btn remove-btn';
    removeBtn.addEventListener('click', () => {
        container.removeChild(stepDiv);
        const index = tab.data.steps.findIndex(step => step.instructionInput === instructionInput);
        if (index > -1) {
            tab.data.steps.splice(index, 1);
        }
        updateStepTitles(container);
    });
    stepDiv.appendChild(removeBtn);

    updateStepTitles(container);
}

function updateStepTitles(container) {
    const stepDivs = container.querySelectorAll('.lesson-step');
    stepDivs.forEach((stepDiv, index) => {
        const stepTitle = stepDiv.querySelector('h4');
        stepTitle.textContent = `Step ${index + 1}`;
    });
}

// Load Quiz Content
function loadQuizContent(container, tab) {
    tab.data = tab.data || {};
    tab.data.questions = tab.data.questions || [];

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Quiz Title';
    titleInput.value = tab.data?.title || '';
    titleInput.className = 'input-field';
    container.appendChild(titleInput);

    const addQuestionBtn = document.createElement('button');
    addQuestionBtn.textContent = 'Add Question';
    addQuestionBtn.className = 'btn';
    container.appendChild(addQuestionBtn);

    addQuestionBtn.addEventListener('click', function () {
        addQuizQuestion(container, tab);
    });

    if (tab.data?.questions) {
        tab.data.questions.forEach(question => {
            addQuizQuestion(container, tab, question);
        });
    }
}

function addQuizQuestion(container, tab, existingQuestion = null) {
    tab.data = tab.data || {};
    tab.data.questions = tab.data.questions || [];

    const questionIndex = tab.data.questions.length + 1;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'quiz-question';
    questionDiv.style.marginBottom = '20px';
    container.appendChild(questionDiv);

    const questionTitle = document.createElement('h4');
    questionTitle.textContent = `Question ${questionIndex}`;
    questionDiv.appendChild(questionTitle);

    const questionInput = document.createElement('input');
    questionInput.type = 'text';
    questionInput.placeholder = 'Question';
    questionInput.value = existingQuestion?.question || '';
    questionInput.className = 'input-field';
    questionDiv.appendChild(questionInput);

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';
    questionDiv.appendChild(choicesContainer);

    for (let i = 0; i < 4; i++) {
        const choiceInput = document.createElement('input');
        choiceInput.type = 'text';
        choiceInput.placeholder = `Choice ${i + 1}`;
        choiceInput.value = existingQuestion?.choices?.[i] || '';
        choiceInput.className = 'input-field';
        choicesContainer.appendChild(choiceInput);
    }

    const correctAnswerSelect = document.createElement('select');
    correctAnswerSelect.className = 'input-field';
    for (let i = 0; i < 4; i++) {
        const option = document.createElement('option');
        option.value = `Choice ${i + 1}`;
        option.textContent = `Choice ${i + 1}`;
        correctAnswerSelect.appendChild(option);
    }
    if (existingQuestion?.correctAnswer) {
        correctAnswerSelect.value = existingQuestion.correctAnswer;
    }
    questionDiv.appendChild(correctAnswerSelect);

    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove Question';
    removeBtn.className = 'btn remove-btn';
    removeBtn.addEventListener('click', () => {
        container.removeChild(questionDiv);
        const index = tab.data.questions.findIndex(q => q.question === questionInput.value);
        if (index > -1) {
            tab.data.questions.splice(index, 1);
        }
        updateQuestionTitles(container);
    });
    questionDiv.appendChild(removeBtn);

    tab.data.questions.push({
        question: questionInput,
        choices: choicesContainer,
        correctAnswer: correctAnswerSelect
    });

    updateQuestionTitles(container);
}

function updateQuestionTitles(container) {
    const questionDivs = container.querySelectorAll('.quiz-question');
    questionDivs.forEach((questionDiv, index) => {
        const questionTitle = questionDiv.querySelector('h4');
        questionTitle.textContent = `Question ${index + 1}`;
    });
}

// Function to add a new content tab
function addContentTab(contentType) {
    const newTabId = `tab-${Date.now()}`; // Use a timestamp for unique IDs
    const contentId = `quill-editor-${newTabId}`;

    // Create tab button
    const tabButton = document.createElement('div');
    tabButton.className = 'tab-btn';
    tabButton.id = newTabId; // Set the ID attribute for reliable identification
    tabButton.textContent = `${contentType} ${tabs.length + 1}`;
    tabButton.draggable = true;

    // Add close button to the tab
    const closeButton = document.createElement('span');
    closeButton.className = 'close-btn';
    closeButton.textContent = 'x';
    closeButton.addEventListener('click', function () {
        removeTab(newTabId);
    });
    tabButton.appendChild(closeButton);

    tabButton.addEventListener('click', function () {
        console.log(`Switching to tab: ${newTabId}`);
        updateActiveTab(newTabId);
    });

    tabsContainer.appendChild(tabButton);

    // Add to tabs array with initialized data
    tabs.push({
        id: newTabId,
        button: tabButton,
        contentId: contentId,
        type: contentType,
        data: {} // Initialize data here
    });

    // Set the new tab as active
    updateActiveTab(newTabId);
}

// Function to remove a tab
function removeTab(tabId) {
    const tabToRemove = tabs.find(tab => tab.id === tabId);
    if (tabToRemove) {
        tabsContainer.removeChild(tabToRemove.button);
        tabs = tabs.filter(tab => tab.id !== tabId);
        // Update active tab if needed
        if (activeTab && activeTab.id === tabId) {
            if (tabs.length > 0) {
                updateActiveTab(tabs[0].id);
            } else {
                editorContent.innerHTML = '';
                activeTab = null;
            }
        }
    }
}

tabsContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('tab-btn')) {
        e.target.classList.add('dragging');
    }
});

tabsContainer.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('tab-btn')) {
        e.target.classList.remove('dragging');
        
        // Update the tabs array to reflect the new order
        const reorderedTabs = [];
        const tabButtons = tabsContainer.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            const tabId = button.id; // Use the button's ID attribute for reliable tab ID extraction
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                reorderedTabs.push(tab);
            }
        });
        tabs = reorderedTabs;
        console.log('Reordered Tabs:', tabs); // Debugging
    }
});

tabsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(tabsContainer, e.clientX);
    const draggingElement = document.querySelector('.dragging');
    if (afterElement == null) {
        tabsContainer.appendChild(draggingElement);
    } else {
        tabsContainer.insertBefore(draggingElement, afterElement);
    }
});

// Helper function to get the element after which the dragged item should be placed
function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.tab-btn:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


// Event listeners for adding new content
document.getElementById('add-article').addEventListener('click', function () {
    addContentTab('Article');
});

document.getElementById('add-lesson').addEventListener('click', function () {
    addContentTab('Lesson');
});

document.getElementById('add-quiz').addEventListener('click', function () {
    addContentTab('Quiz');
});

async function saveModuleData() {
    // Save the current active tab data
    if (activeTab) {
        saveTabData(activeTab);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const moduleId = urlParams.get('moduleId');

    const moduleData = {
        id: moduleId,
        title: document.getElementById('module-title').value,
        tabs: tabs.map(tab => ({
            id: tab.id,
            type: tab.type,
            content: {
                title: tab.data.title || '',
                content: tab.data.content || '',
                description: tab.data.description || '',
                steps: tab.data.steps || [],
                questions: tab.data.questions || [],
                defaultCode: tab.data.defaultCode || ''
            }
        }))
    };
    console.log(moduleData);
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const modules = courseData.modules || [];
            const moduleIndex = modules.findIndex(mod => mod.id === moduleId);

            if (moduleIndex > -1) {
                modules[moduleIndex] = moduleData;
            } else {
                modules.push(moduleData);
            }

            await setDoc(courseDocRef, { modules }, { merge: true });
            alert('Module changes saved successfully!');
        } else {
            console.error('Course not found');
        }
    } catch (error) {
        console.error('Error saving module data:', error);
        alert('Error saving module data. Please try again.');
    }
}

// Save module button
document.getElementById('save-module').addEventListener('click', saveModuleData);

// Ensure saveTabData is called correctly
function saveTabData(tab) {
    const existingTabIndex = tabs.findIndex(t => t.id === tab.id);
    if (existingTabIndex > -1) {
        const existingTab = tabs[existingTabIndex];
        if (tab.type === 'Article') {
            if (tab.editor) {
                existingTab.data.content = tab.editor.root.innerHTML;
            }
            const titleInput = document.querySelector(`#${tab.contentId} .input-field`);
            if (titleInput) {
                existingTab.data.title = titleInput.value;
            }
        }
        if (tab.type === 'Lesson') {
            if (tab.editor) {
                existingTab.data.content = tab.editor.root.innerHTML;
            }
            if (tab.descriptionEditor) {
                existingTab.data.description = tab.descriptionEditor.root.innerHTML;
            }
            const titleInput = document.querySelector(`#${tab.contentId} .input-field`);
            if (titleInput) {
                existingTab.data.title = titleInput.value;
            }
            const stepsContainer = document.querySelector(`#${tab.contentId} .steps-container`);
            const stepDivs = stepsContainer.querySelectorAll('.lesson-step');
            existingTab.data.steps = Array.from(stepDivs).map(stepDiv => {
                const instructionInput = stepDiv.querySelector('textarea[placeholder="Instruction"]');
                const requiredConstructsInput = stepDiv.querySelector('input[placeholder="Required Constructs (comma-separated)"]');
                const customRulesInput = stepDiv.querySelector('textarea[placeholder="Custom Rules (JSON)"]');
                const expectedOutputInput = stepDiv.querySelector('textarea[placeholder="Expected Output"]');
                const verifyMethodInput = stepDiv.querySelector('select');

                return {
                    instruction: instructionInput?.value || '',
                    requiredConstructs: requiredConstructsInput?.value.split(',').map(s => s.trim()) || [],
                    customRules: JSON.parse(customRulesInput?.value || '{}'),
                    expectedOutput: expectedOutputInput?.value || '',
                    verifyMethod: verifyMethodInput?.value || ''
                };
            });
            if (tab.aceEditor) {
                existingTab.data.defaultCode = tab.aceEditor.getValue();
            }
        }
        if (tab.type === 'Quiz') {
            const titleInput = document.querySelector(`#${tab.contentId} .input-field`);
            if (titleInput) {
                existingTab.data.title = titleInput.value;
            }
            const questionDivs = document.querySelectorAll(`#${tab.contentId} .quiz-question`);
            existingTab.data.questions = Array.from(questionDivs).map(questionDiv => {
                const questionInput = questionDiv.querySelector('input[placeholder="Question"]');
                const choices = Array.from(questionDiv.querySelectorAll('.choices-container input')).map(choice => choice.value);
                const correctAnswerSelect = questionDiv.querySelector('select');

                return {
                    question: questionInput?.value || '',
                    choices: choices,
                    correctAnswer: correctAnswerSelect?.value || ''
                };
            });
        }
    }
}

async function loadModuleData() {
    // Extract courseId and moduleId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const moduleId = urlParams.get('moduleId');

    if (!courseId || !moduleId) {
        console.error('Missing courseId or moduleId');
        return;
    }

    try {
        // Fetch course document from Firestore
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const modules = courseData.modules || [];

            // Find the specific module based on moduleId
            const moduleData = modules.find(mod => mod.id === moduleId);
            if (moduleData && moduleData.tabs && moduleData.tabs.length > 0) {
                console.log(moduleData);
                // Iterate through each saved tab
                moduleData.tabs.forEach(savedTab => {
                    // Add the content tab (Article, Lesson, or Quiz)
                    addContentTab(savedTab.type);

                    // Get the reference to the current active tab
                    const currentTab = tabs[tabs.length - 1]; // Latest added tab will be the current one

                    // Populate the tab data based on its type
                    if (savedTab.type === 'Article') {
                        currentTab.data.title = savedTab.content.title || '';
                        currentTab.data.content = savedTab.content.content || '';
                        
                        // Load the content in the Quill editor
                        loadEditorContent(currentTab);
                    } else if (savedTab.type === 'Lesson') {
                        currentTab.data.title = savedTab.content.title || '';
                        currentTab.data.description = savedTab.content.description || '';
                        currentTab.data.steps = savedTab.content.steps || [];
                        currentTab.data.defaultCode = savedTab.content.defaultCode || '';

                        // Load the lesson content (description, steps, code editor)
                        loadEditorContent(currentTab);
                    } else if (savedTab.type === 'Quiz') {
                        currentTab.data.title = savedTab.content.title || '';
                        currentTab.data.questions = savedTab.content.questions || [];

                        // Load the quiz content (questions, choices, etc.)
                        loadEditorContent(currentTab);
                    }
                });

                // Set the first tab as the active tab after loading
                if (tabs.length > 0) {
                    updateActiveTab(tabs[0].id); // Set the first tab as active
                }
            } else {
                console.log('No saved tabs for this module.');
            }
        } else {
            console.error('Course not found');
        }
    } catch (error) {
        console.error('Error loading module data:', error);
        alert('Error loading module data. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', loadModuleData);