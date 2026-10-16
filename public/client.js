onst noteForm = document.getElementById("noteForm");
const noteInput = document.getElementById("noteInput");
const notesList = document.getElementById("notesList");
const noteStatus = document.getElementById("noteStatus");

// Load existing notes from the server
async function loadNotes() {
    try {
        const response = await fetch("/api/notes");

        if (!response.ok) {
            throw new Error("Could not load notes");
        }

        const notes = await response.json();

        notesList.replaceChildren();

        notes.forEach(function(note) {
            const item = document.createElement("li");

            // Handle notes stored as strings or objects
            if (typeof note === "string") {
                item.textContent = note;
            } else {
                item.textContent = note.note;
            }

            notesList.appendChild(item);
        });
    } catch (error) {
        noteStatus.textContent = "Could not load notes.";
        console.error(error);
    }
}

// Save a note without refreshing the page
noteForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const note = noteInput.value.trim();

    if (!note) {
        return;
    }

    noteStatus.textContent = "Saving...";

    try {
        const response = await fetch("/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ note: note })
        });

        if (!response.ok) {
            throw new Error("Could not save note");
        }

        noteInput.value = "";
        noteStatus.textContent = "Note saved!";

        await loadNotes();
    } catch (error) {
        noteStatus.textContent = "Could not save the note. Try again.";
        console.error(error);
    }
});

// Display notes when the page opens
loadNotes();