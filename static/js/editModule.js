import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showPopup } from './popup.js'; 
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

    // Create dropdown for verifyMethod
    const verifyMethodInput = document.createElement('select');
    verifyMethodInput.className = 'input-field';
    verifyMethodInput.style.width = '100%';
    const verifyMethods = [
        { label: 'Exact Match', value: 'exact_match' },
        { label: 'Output Check', value: 'output_check' },
        { label: 'Variable Check', value: 'variable_check' }
    ];
    verifyMethods.forEach(method => {
        const option = document.createElement('option');
        option.value = method.value;
        option.textContent = method.label;
        verifyMethodInput.appendChild(option);
    });
    verifyMethodInput.value = existingStep?.verifyMethod || 'exact_match';
    stepDiv.appendChild(verifyMethodInput);

    // Container for dynamic custom rules (based on verify method)
    const customRulesContainer = document.createElement('div');
    stepDiv.appendChild(customRulesContainer);

    // Function to render custom rule inputs based on selected verifyMethod
    function renderCustomRules() {
        customRulesContainer.innerHTML = ''; // Clear previous inputs

        if (verifyMethodInput.value === 'output_check') {
            // Add input for expected output
            const expectedOutputInput = document.createElement('textarea');
            expectedOutputInput.placeholder = 'Expected Output';
            expectedOutputInput.value = existingStep?.customRules?.params?.expected_output || '';
            expectedOutputInput.className = 'input-field';
            expectedOutputInput.style.width = '100%';
            customRulesContainer.appendChild(expectedOutputInput);

            stepDiv.customRulesInput = () => ({
                type: 'output_check',
                params: { expected_output: expectedOutputInput.value }
            });
        } else if (verifyMethodInput.value === 'variable_check') {
            // Add inputs for variable name and expected value
            const variableNameInput = document.createElement('input');
            variableNameInput.type = 'text';
            variableNameInput.placeholder = 'Variable Name';
            variableNameInput.value = existingStep?.customRules?.params?.variable_name || '';
            variableNameInput.className = 'input-field';
            variableNameInput.style.width = '100%';
            customRulesContainer.appendChild(variableNameInput);

            const expectedValueInput = document.createElement('input');
            expectedValueInput.type = 'text';
            expectedValueInput.placeholder = 'Expected Value';
            expectedValueInput.value = existingStep?.customRules?.params?.expected_value || '';
            expectedValueInput.className = 'input-field';
            expectedValueInput.style.width = '100%';
            customRulesContainer.appendChild(expectedValueInput);

            stepDiv.customRulesInput = () => ({
                type: 'variable_check',
                params: {
                    variable_name: variableNameInput.value,
                    expected_value: expectedValueInput.value
                }
            });
        } else {
            // Default to exact_match or other methods without additional fields
            stepDiv.customRulesInput = () => ({
                type: 'exact_match',
                params: {}
            });
        }
    }

    // Initialize the custom rules based on existing step or default
    renderCustomRules();
    
    // Re-render custom fields when verifyMethod is changed
    verifyMethodInput.addEventListener('change', renderCustomRules);

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

    // Prepare the module data to be saved
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

    try {
        // Get the course document reference
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);
        console.log('Fetched document data:', courseDoc.data());

        if (courseDoc.exists()) {
            // Fetch existing modules from Firestore
            const courseData = courseDoc.data();
            let modules = courseData.modules || [];
            console.log('modules',modules);

            // Find the module by its id
            let moduleIndex = modules.findIndex(mod => mod.id === moduleId);

            if (moduleIndex > -1) {
                // Update the existing module data in-place
                modules[moduleIndex] = moduleData;
            } else {
                // If module doesn't exist, append it to the array
                modules.push(moduleData);
            }

            // Save the updated modules array back to Firestore
            await setDoc(courseDocRef, { modules }, { merge: true });

            showPopup({
                title: "Success",
                message: "Module changes saved successfully!",
                type: "success"
            });
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
            const titleInput = document.querySelector(`#${tab.contentId} input[placeholder="Lesson Title"]`);
            const descriptionEditor = tab.descriptionEditor;

            if (titleInput) {
                existingTab.data.title = titleInput.value; // Store lesson title
            }
            if (descriptionEditor) {
                existingTab.data.description = descriptionEditor.root.innerHTML; // Store lesson description
            }

            const stepsContainer = document.querySelector(`#${tab.contentId} .steps-container`);
            const stepDivs = stepsContainer.querySelectorAll('.lesson-step');
            
            // Process each step and save the data properly
            existingTab.data.steps = Array.from(stepDivs).map(stepDiv => {
                const instructionInput = stepDiv.querySelector('textarea[placeholder="Instruction"]');
                const requiredConstructsInput = stepDiv.querySelector('input[placeholder="Required Constructs (comma-separated)"]');
                const verifyMethodInput = stepDiv.querySelector('select');
                const customRulesInput = stepDiv.customRulesInput();

                return {
                    instruction: instructionInput?.value || '', // Save the instruction
                    requiredConstructs: requiredConstructsInput?.value.split(',').map(s => s.trim()) || [], // Convert constructs to an array
                    customRules: customRulesInput || {}, // Handle custom rules dynamically
                    verifyMethod: verifyMethodInput?.value || 'exact_match', // Save verify method
                };
            });

            if (tab.aceEditor) {
                existingTab.data.defaultCode = tab.aceEditor.getValue(); // Save the default code from the ACE editor
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
            document.getElementById('module-title').value = moduleData.title || 'Untitled Module';
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

// Add this function near your other event listeners
async function previewModule() {
    // Save the module data first
    await saveModuleData();

    // Get the current courseId and moduleId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const moduleId = urlParams.get('moduleId');

    // Get the current active tab
    if (activeTab) {
        const tabType = activeTab.type.toLowerCase();
        const tabId = activeTab.id;

        if (courseId && moduleId && tabId) {
            // Construct the preview URL based on the content type
            const previewUrl = `/admin/${tabType}?courseId=${courseId}&moduleId=${moduleId}&tabId=${tabId}`;
            
            // Open in a new tab
            window.open(previewUrl, '_blank');
        } else {
            alert('Please ensure all content is saved before previewing.');
        }
    } else {
        alert('Please select a tab to preview.');
    }
}

// Add event listener for the preview button
document.getElementById('preview-module').addEventListener('click', previewModule);