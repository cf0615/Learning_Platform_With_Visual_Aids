// Quill editor options
const quillOptions = {
    theme: 'snow'
};

// Module Counter to keep track of modules
let moduleCounter = 0;

// Function to add a new module
document.getElementById('add-module').addEventListener('click', function () {
    moduleCounter++;

    // Create the module container
    const moduleContainer = document.createElement('div');
    moduleContainer.className = 'module-section';
    moduleContainer.id = `module-${moduleCounter}`;

    // Add module title input and collapse/expand button
    const moduleHeader = document.createElement('div');
    moduleHeader.className = 'module-header';
    const moduleTitle = document.createElement('h4');
    moduleTitle.textContent = `Module ${moduleCounter}`;
    const collapseButton = document.createElement('button');
    collapseButton.textContent = 'Collapse';
    collapseButton.className = 'collapse-btn';
    collapseButton.addEventListener('click', function () {
        toggleModuleCollapse(moduleContainer, collapseButton);
    });
    moduleHeader.appendChild(moduleTitle);
    moduleHeader.appendChild(collapseButton);
    moduleContainer.appendChild(moduleHeader);

    // Create a list of items inside the module (articles, lessons, quizzes)
    const moduleList = document.createElement('ul');
    moduleList.id = `module-list-${moduleCounter}`;
    moduleContainer.appendChild(moduleList);

    // Append the module container to the main module section
    document.getElementById('module-section').appendChild(moduleContainer);

    // Create buttons to add article, lesson, or quiz
    const addArticleBtn = document.createElement('button');
    addArticleBtn.textContent = 'Add Article';
    addArticleBtn.className = 'btn';
    addArticleBtn.addEventListener('click', function () {
        createNewTab(moduleCounter, 'Article');
    });

    const addLessonBtn = document.createElement('button');
    addLessonBtn.textContent = 'Add Lesson';
    addLessonBtn.className = 'btn';
    addLessonBtn.addEventListener('click', function () {
        createNewTab(moduleCounter, 'Lesson');
    });

    const addQuizBtn = document.createElement('button');
    addQuizBtn.textContent = 'Add Quiz';
    addQuizBtn.className = 'btn';
    addQuizBtn.addEventListener('click', function () {
        createNewTab(moduleCounter, 'Quiz');
    });

    moduleContainer.appendChild(addArticleBtn);
    moduleContainer.appendChild(addLessonBtn);
    moduleContainer.appendChild(addQuizBtn);
});

// Function to add an item (article, lesson, quiz) to a module
function addModuleItem(moduleList, itemType, moduleId) {
    const listItem = document.createElement('li');
    listItem.textContent = `${itemType} ${moduleList.children.length + 1}`;
    listItem.addEventListener('click', function () {
        updateEditor(moduleId);
    });
    moduleList.appendChild(listItem);
}

// Function to update the editor based on the selected module
function updateEditor(moduleId) {
    const editorSection = document.getElementById('editor-section');
    const editorTabs = document.getElementById('editor-tabs');
    const editorContent = document.getElementById('editor-content');

    // Clear the previous editor content
    editorTabs.innerHTML = '';
    editorContent.innerHTML = '';

    // Dynamically create tabs and content based on the selected module
    const moduleList = document.getElementById(`module-list-${moduleId}`);
    const items = moduleList.children;

    for (let i = 0; i < items.length; i++) {
        const tabButton = document.createElement('button');
        tabButton.textContent = items[i].textContent;
        tabButton.addEventListener('click', function () {
            loadEditorContent(items[i].textContent);
        });
        editorTabs.appendChild(tabButton);
    }

    // Show the editor section
    editorSection.classList.remove('hidden');
}

// Function to dynamically load the editor content
function loadEditorContent(tabType, itemId) {
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = ''; // Clear previous content

    if (tabType === 'Article') {
        // Create input field for the article title
        const articleTitleInput = document.createElement('input');
        articleTitleInput.type = 'text';
        articleTitleInput.placeholder = `Enter ${tabType} ${itemId} title`;
        articleTitleInput.className = 'article-title-input';

        // Create a div for the Quill editor
        const articleContentDiv = document.createElement('div');
        articleContentDiv.id = `quill-editor-${tabType}-${itemId}`;
        articleContentDiv.style.height = '200px';

        editorContent.appendChild(articleTitleInput);
        editorContent.appendChild(articleContentDiv);

        // Initialize Quill editor for article content
        setTimeout(() => {
            new Quill(articleContentDiv, { theme: 'snow' });
        }, 0);

    } else if (tabType === 'Lesson') {
        // Lesson title and description
        const lessonTitleInput = document.createElement('input');
        lessonTitleInput.type = 'text';
        lessonTitleInput.placeholder = `Enter ${tabType} ${itemId} title`;
        lessonTitleInput.className = 'lesson-title-input';

        const lessonContentDiv = document.createElement('div');
        lessonContentDiv.id = `quill-editor-${tabType}-${itemId}`;
        lessonContentDiv.style.height = '200px';

        editorContent.appendChild(lessonTitleInput);
        editorContent.appendChild(lessonContentDiv);

        // Initialize Quill editor for lesson content
        setTimeout(() => {
            new Quill(lessonContentDiv, { theme: 'snow' });
        }, 0);

    } else if (tabType === 'Quiz') {
        // Create input field for quiz question
        const quizQuestionInput = document.createElement('input');
        quizQuestionInput.type = 'text';
        quizQuestionInput.placeholder = `Enter quiz question for ${tabType} ${itemId}`;
        quizQuestionInput.className = 'quiz-question-input';

        // Create answer inputs
        const answerContainer = document.createElement('div');
        answerContainer.className = 'answer-container';

        for (let i = 1; i <= 4; i++) {
            const answerInput = document.createElement('input');
            answerInput.type = 'text';
            answerInput.placeholder = `Answer ${i}`;
            answerContainer.appendChild(answerInput);
        }

        const correctAnswerLabel = document.createElement('label');
        correctAnswerLabel.textContent = 'Select Correct Answer:';

        const correctAnswerSelect = document.createElement('select');
        for (let i = 1; i <= 4; i++) {
            const option = document.createElement('option');
            option.value = `Answer ${i}`;
            option.textContent = `Answer ${i}`;
            correctAnswerSelect.appendChild(option);
        }

        // Append the inputs to the editor content
        editorContent.appendChild(quizQuestionInput);
        editorContent.appendChild(answerContainer);
        editorContent.appendChild(correctAnswerLabel);
        editorContent.appendChild(correctAnswerSelect);
    }
}

// Function to toggle collapse/expand state
function toggleModuleCollapse(moduleContainer, collapseButton) {
    const isCollapsed = moduleContainer.classList.contains('collapsed');
    const moduleList = moduleContainer.querySelector('ul');

    if (isCollapsed) {
        moduleContainer.classList.remove('collapsed');
        collapseButton.textContent = 'Collapse';
        moduleList.style.display = 'block';
    } else {
        moduleContainer.classList.add('collapsed');
        collapseButton.textContent = 'Expand';
        moduleList.style.display = 'none';
    }
}

// Function to create new tabs for each item type (Article, Lesson, Quiz)
function createNewTab(moduleId, tabType) {
    const editorSection = document.getElementById('editor-section');
    const editorTabs = document.getElementById('editor-tabs');
    const editorContent = document.getElementById('editor-content');

    // Create a tab for the new item
    const tabButton = document.createElement('button');
    tabButton.textContent = `${tabType} ${editorTabs.children.length + 1}`;
    tabButton.addEventListener('click', function () {
        loadEditorContent(tabType, editorTabs.children.length + 1);
    });
    editorTabs.appendChild(tabButton);

    // Display the editor below the module section
    editorSection.classList.remove('hidden');

    // Automatically load the editor content for the new item
    loadEditorContent(tabType, editorTabs.children.length);
}

// Function to switch tabs within a module
function switchTab(tabButton, tabContentsContainer) {
    // Deselect all other tabs
    tabButton.parentNode.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    tabButton.classList.add('active');

    // Hide all other tab contents
    tabContentsContainer.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

    // Show the current tab content
    document.getElementById(tabButton.getAttribute('data-tab-id')).style.display = 'block';
}