var toolbarOptions = [
    [{'font': []}],
    [{'size': ['small', false, 'large', 'huge']}],
    ['bold', 'italic', 'underline', 'strike'],        
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    [{ 'align': [] }],  // Alignments (justify, center, left, right)
    ['code-block'], // Code block option
    ['undo', 'redo'] // Undo and Redo buttons can be added with custom JavaScript
  ];

document.getElementById("add-module").addEventListener("click", function() {
    let moduleSection = document.getElementById("modules-section");
    let newModule = document.createElement("div");
    newModule.classList.add("module");

    newModule.innerHTML = `
        <label>Module Title</label>
        <input type="text" class="module-title" placeholder="Enter module title">

        <label>Article</label>
        <textarea class="module-article" placeholder="Enter article content"></textarea>
        
        <label>Lesson</label>
        <div class="lesson">
            <input type="text" class="lesson-title" placeholder="Enter lesson title">
            <textarea class="lesson-content" placeholder="Lesson content"></textarea>
            <textarea class="lesson-default-code" placeholder="Default code (optional)"></textarea>
            <textarea class="lesson-tips" placeholder="Coding tips (optional)"></textarea>
        </div>
    `;

    moduleSection.appendChild(newModule);
});

function showSection(section) {
    document.getElementById('article-section').style.display = 'none';
    document.getElementById('lesson-section').style.display = 'none';
    document.getElementById('quiz-section').style.display = 'none';
  
    document.getElementById(section + '-section').style.display = 'block';
}

var articleEditor = new Quill('#article-editor', 
    {modules: {toolbar: toolbarOptions}, theme: 'snow'},
);

