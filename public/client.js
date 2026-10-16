const noteForm = document.getElementById("noteForm");
const noteInput = document.getElementById("noteInput");
const notesList = document.getElementById("notesList");
const noteStatus = document.getElementById("noteStatus");

// Load notes from the server
function loadNotes() {
    fetch("/api/notes")
        .then(response => response.json())
        .then(notes => {
            notesList.innerHTML = "";

            notes.forEach(note => {
                const item = document.createElement("li");
                item.textContent = note.text;
                notesList.appendChild(item);
            });
        })
        .catch(error => {
            noteStatus.textContent = "Could not load notes.";
            console.log(error);
        });
}

// Save a new note
noteForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const note = noteInput.value.trim();

    if (note === "") {
        return;
    }

    fetch("/notes", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ note: note })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not save note");
            }

            noteInput.value = "";
            noteStatus.textContent = "Note saved!";
            loadNotes();
        })
        .catch(error => {
            noteStatus.textContent = "Could not save note.";
            console.log(error);
        });
});

// Load notes when the page opens
loadNotes();