// Initialize the Ace editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/python");

// Get elements
const runButton = document.getElementById("runButton");
const output = document.getElementById("output");

// Function to run code
runButton.addEventListener("click", () => {
    const code = editor.getValue();
    try {
        // Evaluate the code (this is a very basic example and not suitable for actual Python code)
        const result = eval(code);
        output.textContent = result || "Code executed successfully.";
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
});
