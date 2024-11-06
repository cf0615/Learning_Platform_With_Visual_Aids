import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { saveStudyTime } from './timeTracking.js';  // Import your save function
import { showPopup } from './popup.js';  // Import the showPopup function

// Global variables
let editor = null;
let traceData = null;
let visualizer = null;
let currentStep = 0;
let isCodeVerified = false;
let lessonCategory = '';
let currentUser = null;
let lessonData = null;

// Initialize editor when the page loads
function initializeEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/python"); // Default mode
    editor.setOptions({
        fontSize: "12pt",
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
    });
}

// Function to handle code execution
async function runCode() {
    if (!editor) return;
    
    const code = editor.getValue();
    const language = getLanguageFromCategory();
    
    try {
        const response = await fetch('http://127.0.0.1:5000/run_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language })
        });
        const data = await response.json();
        
        traceData = {
            code: data.code,
            trace: data.trace
        };

        // Verify the code execution
        const isCorrect = await verifyCode(traceData, lessonData);
        isCodeVerified = isCorrect;

        // Update the next button state
        updateNextButtonState();

        if (isCorrect) {
            showPopup({
                title: "Success",
                message: "Code is correct! You can now proceed to the next lesson.",
                type: "success",
                showCancel: false
            });
        } else {
            showPopup({
                title: "Incorrect Code",
                message: "Your code does not meet all the instructions. Please review and try again.",
                type: "error",
                showCancel: false
            });
        }

        // Initialize visualization
        if (traceData) {
            const visualizerLang = getVisualizerLang(language);
            visualizer = new ExecutionVisualizer('visualization', traceData, {
                hideCode: true,
                lang: visualizerLang
            });
        }

        currentStep = 0;
        highlightCurrentLine();
    } catch (error) {
        console.error('Error:', error);
        showPopup({
            title: "Error",
            message: "An error occurred while running your code. Please try again.",
            type: "error",
            showCancel: false
        });
    }
}

// Function to highlight current line
function highlightCurrentLine() {
    if (!traceData || !traceData.trace || !editor) {
        console.error("Trace data or editor is not available");
        return;
    }

    editor.session.clearBreakpoints();
    if (editor.session.currentMarker) {
        editor.session.removeMarker(editor.session.currentMarker);
    }

    const currentLine = traceData.trace[currentStep].line - 1;
    editor.session.setBreakpoint(currentLine, "ace_active-line");

    if (currentLine >= 0) {
        const lineLength = editor.session.getLine(currentLine).length;
        const range = new ace.Range(currentLine, 0, currentLine, lineLength);
        const markerId = editor.session.addMarker(range, "ace_custom-marker", "fullLine", true);
        editor.session.currentMarker = markerId;
        editor.renderer.updateFull();
    }
}

// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    loadLessonData(courseId, moduleId, tabId);
    initializeEditor();

    // Add event listeners
    document.querySelector(".run-btn")?.addEventListener("click", runCode);

    document.querySelector(".control-btn:nth-child(2)")?.addEventListener("click", () => {
        if (traceData && currentStep > 0) {
            currentStep--;
            if (visualizer) visualizer.stepBack();
            highlightCurrentLine();
        }
    });

    document.querySelector(".control-btn:nth-child(3)")?.addEventListener("click", () => {
        if (traceData && currentStep < traceData.trace.length - 1) {
            currentStep++;
            if (visualizer) visualizer.stepForward();
            highlightCurrentLine();
        }
    });

    // Initialize next button state
    updateNextButtonState();
});

function getParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const moduleId = urlParams.get('moduleId');
    const tabId = urlParams.get('tabId');
    const type = window.location.pathname.split('/')[2]; // Extract type from /user/{type}

    return { courseId, moduleId, tabId, type };
}

async function loadLessonData(courseId, moduleId, tabId) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            const courseTitle = courseData.title;
            const moduleData = courseData.modules.find(mod => mod.id === moduleId);
            const moduleTitle = moduleData.title;
            lessonCategory = courseData.category;
            const tabData = moduleData.tabs.find(tabs => tabs.id === tabId);
            console.log(lessonCategory);
            console.log(moduleData);

            if (moduleData && tabData && tabData.type === 'Lesson') {
                const lessonTab = tabData;
                lessonData = tabData;
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
    const instructionsList = document.getElementById('instructions-list');
    instructionsList.innerHTML = ''; // Clear existing instructions
    lessonTab.content.steps.forEach(step => {
        const stepItem = document.createElement('li');
        stepItem.textContent = step.instruction;

        // Add a span for the completion status
        const statusIndicator = document.createElement('span');
        statusIndicator.className = 'completion-status'; // Placeholder for checkmark circle
        stepItem.appendChild(statusIndicator);

        instructionsList.appendChild(stepItem);
    });

    // Set the Ace editor mode based on the lesson category
    let aceMode = "";
    if (lessonCategory === "Python") {
        aceMode = "ace/mode/python";
    } else if (lessonCategory === "Java") {
        aceMode = "ace/mode/java";
    } else if (lessonCategory === "C++") {
        aceMode = "ace/mode/c_cpp";
    }

    // Update Ace Editor with default code
    const editor = ace.edit("editor");
    editor.session.setMode(aceMode);
    editor.setValue(lessonTab.content.defaultCode, -1); // -1 to move cursor to start
    editor.setOptions({
        highlightActiveLine: false,  // Disable default active line highlighting
        highlightGutterLine: false   // Disable gutter line highlight
    });
}

function getLanguageFromCategory() {
    if (lessonCategory === 'Python') return 'python';
    if (lessonCategory === 'Java') return 'java';
    if (lessonCategory === 'C++') return 'cpp';
    //return 'python'; // Default
}

function getVisualizerLang(language) {
    if (language === 'python') return 'py3';
    if (language === 'java') return 'java'; // Adjust according to the visualizer
    if (language === 'cpp') return 'cpp';   // Adjust accordingly
    //return 'py3'; // Default
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;  // Store the user globally
        console.log("User is logged in:", currentUser.uid);
        // Proceed with your logic after the user is confirmed logged in
    } else {
        console.log("User not logged in");
        window.location.href = '/';  // Redirect to login page if not logged in
    }
});

async function verifyCode(traceData, lessonTabData) {
    const steps = lessonTabData.content.steps || [];
    let allStepsCompleted = true;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const customRules = step.customRules;
        const verifyMethod = step.verifyMethod;
        let stepCompleted = false;

        // Verify the step based on its method
        switch (verifyMethod) {
            case 'variable_check':
                stepCompleted = verifyVariable(traceData, customRules.params);
                break;
            case 'output_check':
                stepCompleted = verifyOutput(traceData, customRules.params.expected_output);
                break;
            default:
                console.error(`Unknown verification method: ${verifyMethod}`);
        }

        // Set the `completed` status of the step
        step.completed = stepCompleted;

        // Update the UI for this step immediately
        updateStepCompletionStatus(i, stepCompleted);

        // If any step fails, mark `allStepsCompleted` as false
        if (!stepCompleted) {
            allStepsCompleted = false;
            console.log(`Step failed: ${step.instruction}`);
        } else {
            console.log(`Step completed: ${step.instruction}`);
        }
    }

    return allStepsCompleted;
}

// Function to verify if a specific variable exists and has the correct value
function verifyVariable(traceData, params) {
    const { variable_name, expected_value } = params;
    
    if (!variable_name || expected_value === undefined) {
        console.error("Variable name or expected value is missing in the custom rules");
        return false;
    }

    // Access the last step in the trace
    const lastStep = traceData.trace[traceData.trace.length - 1];

    // Check both globals and stack frame locals
    const globals = lastStep.globals;
    const stackFrame = lastStep.stack_to_render?.[0];
    const locals = stackFrame?.encoded_locals;

    // Log for debugging
    console.log("Globals at the last step:", globals);
    console.log("Locals at the last step:", locals);
    
    // First check globals, then check locals if not found in globals
    if (globals?.hasOwnProperty(variable_name)) {
        const actualValue = globals[variable_name];
        console.log(`Comparing global variable ${variable_name}: actual (${actualValue}) vs expected (${expected_value})`);
        return actualValue == expected_value;
    } else if (locals?.hasOwnProperty(variable_name)) {
        const actualValue = locals[variable_name];
        console.log(`Comparing local variable ${variable_name}: actual (${actualValue}) vs expected (${expected_value})`);
        return actualValue == expected_value;
    } else {
        console.error(`Variable ${variable_name} not found in globals or locals`);
        return false;
    }
}

// Function to verify if the printed output matches expected output
function verifyOutput(traceData, expectedOutput) {
    if (!expectedOutput) {
        console.error("Expected output is missing in the lesson data");
        return false;
    }

    // Get the last step's stdout
    const lastStep = traceData.trace[traceData.trace.length - 1];
    const actualOutput = lastStep.stdout.trim();
    const language = getLanguageFromCategory();

    // Format the outputs differently based on language
    if (language === 'java') {
        // For Java, we need to handle the newline differently
        const actualLines = actualOutput.split('\n');
        const expectedLines = expectedOutput.split('\\n');

        console.log('Java Output Check:');
        console.log('Actual lines:', actualLines);
        console.log('Expected lines:', expectedLines);

        // Compare each line after trimming
        for (let i = 0; i < expectedLines.length; i++) {
            if (!actualLines[i] || actualLines[i].trim() !== expectedLines[i].trim()) {
                console.log(`Line ${i + 1} mismatch:`);
                console.log(`Actual: "${actualLines[i] ? actualLines[i].trim() : 'undefined'}"`);
                console.log(`Expected: "${expectedLines[i].trim()}"`);
                return false;
            }
        }
        return true;
    } else {
        // For Python and other languages, use the original includes method
        console.log('Python Output Check:');
        console.log('Actual Output:', actualOutput);
        console.log('Expected Output:', expectedOutput);
        return actualOutput.includes(expectedOutput.trim());
    }
}

function updateStepCompletionStatus(stepIndex, isCompleted) {
    const instructionsList = document.getElementById('instructions-list');
    const stepItems = instructionsList.getElementsByTagName('li');

    // Ensure the step item exists before updating
    if (stepItems[stepIndex]) {
        const statusIndicator = stepItems[stepIndex].querySelector('.completion-status');

        // If the step is completed, add the checkmark
        if (isCompleted) {
            statusIndicator.classList.add('completed');
            statusIndicator.textContent = '✔'; // Show checkmark inside circle
        } else {
            statusIndicator.classList.remove('completed');
            statusIndicator.textContent = ''; // Clear checkmark if incomplete
        }
    }
}

async function markTabCompleteAndGoNext() {
    const { courseId, moduleId, tabId } = getParamsFromUrl();
    const userId = currentUser.uid;
    const enrollmentRef = doc(db, 'enrollments', userId);

    try {
        // Fetch enrollment data
        const enrollmentSnapshot = await getDoc(enrollmentRef);
        const enrollmentData = enrollmentSnapshot.data();
        const courseKey = `courseId_${courseId}`;
        
        // Update tab completion status
        enrollmentData[courseKey].progress.modules[moduleId].tabs[tabId].completed = true;

        // Check if all tabs in the module are completed
        const isModuleCompleted = checkIfModuleCompleted(enrollmentData[courseKey].progress.modules[moduleId]);

        if (isModuleCompleted) {
            // Update module completion status
            enrollmentData[courseKey].progress.modules[moduleId].completed = true;
            console.log("Module marked as completed");
            
            // Check if the course is completed
            const isCourseCompleted = checkIfCourseCompleted(enrollmentData[courseKey].progress.modules);

            if (isCourseCompleted) {
                console.log("Course completed!");
                
                // Generate the digital badge for the student
                const courseRef = doc(db, 'courses', courseId);
                const courseSnapshot = await getDoc(courseRef);
                const courseData = courseSnapshot.data();

                await generateDigitalBadge(userId, courseId, courseData);
                alert("Congratulations! You have completed the course and earned a badge!");
            }
        }

        // Update the entire enrollment document in Firestore
        await setDoc(enrollmentRef, enrollmentData);
        console.log("Enrollment data updated successfully");

        // Navigate to the next tab
        await goToNextTab(courseId, moduleId, tabId);
    } catch (error) {
        console.error("Error in markTabCompleteAndGoNext:", error);
    }
}

// Function to check if the module is completed
function checkIfModuleCompleted(module) {
    // Check if all tabs are completed
    for (const tabId in module.tabs) {
        if (!module.tabs[tabId].completed) {
            return false;
        }
    }
    return true;
}

// Function to check if the course is completed
function checkIfCourseCompleted(modules) {
    // Check if all modules are completed
    for (const moduleId in modules) {
        if (!modules[moduleId].completed) {
            return false;
        }
    }
    return true;
}

// Function to generate a digital badge for the user
async function generateDigitalBadge(userId, courseId, courseData) {
    // Prepare badge data with additional course details
    const badgeData = {
        badgeId: `${userId}_${courseId}`,
        userId: userId,
        courseId: courseId,
        badgeIssuedOn: new Date().toISOString(),
        badgeType: "Course Completion",
        badgeUrl: courseData.badgeUrl,  // Example URL for the badge image
        title: `${courseData.title} Completion`,  // Use the course title for badge title
        description: `Awarded for successfully completing the ${courseData.title} course.`,
        skills: [courseData.category],  // Use category as a proxy for skills or primary language
        courseDescription: courseData.description  // Use course description
    };

    // Store the badge information in the Firestore 'badges' collection
    const badgeRef = doc(db, 'badges', `${userId}_${courseId}`);
    await setDoc(badgeRef, badgeData);
}

async function goToNextTab(courseId, moduleId, currentTabId) {
    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnapshot = await getDoc(courseRef);
        const courseData = courseSnapshot.data();
        const module = courseData.modules.find(mod => mod.id === moduleId);

        if (!module) {
            console.error("Module not found.");
            return;
        }

        // Get sorted tabs based on their order
        const sortedTabs = module.tabs;
        const currentTabIndex = sortedTabs.findIndex(tab => tab.id === currentTabId);

        if (currentTabIndex !== -1 && currentTabIndex < sortedTabs.length - 1) {
            const nextTab = sortedTabs[currentTabIndex + 1];
            const newUrl = `/user/${nextTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${moduleId}&tabId=${nextTab.id}`;
            await saveStudyTime();
            window.location.href = newUrl;
        } else {
            console.log("No more tabs in the current module.");

            // Check for the next module
            const currentModuleIndex = courseData.modules.findIndex(mod => mod.id === moduleId);
            if (currentModuleIndex !== -1 && currentModuleIndex < courseData.modules.length - 1) {
                const nextModule = courseData.modules[currentModuleIndex + 1];
                const firstTab = nextModule.tabs[0];
                const newUrl = `/user/${firstTab.type.toLowerCase()}?courseId=${courseId}&moduleId=${nextModule.id}&tabId=${firstTab.id}`;
                alert("Proceeding to the next module.");
                await saveStudyTime();
                window.location.href = newUrl;
            } else {
                console.log("No more modules. Redirecting to dashboard.");
                await saveStudyTime();
                window.location.href = `/user/dashboard`;
            }
        }
    } catch (error) {
        console.error("Error navigating to the next tab:", error);
    }
}

// Add function to update next button state
function updateNextButtonState() {
    const nextButton = document.getElementById("next-btn");
    if (!isCodeVerified) {
        nextButton.disabled = true;
        nextButton.classList.add('disabled');
        nextButton.title = "Complete the coding exercise to proceed";
    } else {
        nextButton.disabled = false;
        nextButton.classList.remove('disabled');
        nextButton.title = "Proceed to next lesson";
    }
}

// Modify the next button click handler
document.getElementById("next-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!isCodeVerified) {
        showPopup({
            title: "Cannot Proceed",
            message: "Please complete the coding exercise correctly before moving to the next lesson.",
            type: "warning",
            showCancel: false
        });
        return;
    }
    await markTabCompleteAndGoNext();
});

// Call this when the page loads to set initial button state
document.addEventListener('DOMContentLoaded', () => {
    updateNextButtonState();
});