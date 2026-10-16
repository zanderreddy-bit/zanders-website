loadNotesButton.addEventListener("click", async () => {
    notesStatus.textContent = "Loading notes...";
    notesList.replaceChildren();

    try {
        const response = await fetch("/api/notes");

        if (!response.ok) {
            throw new Error("Could not load notes.");
        }

        const notes = await response.json();

        if (notes.length === 0) {
            notesStatus.textContent = "No notes have been saved yet.";
            return;
        }

        notesStatus.textContent = "";

        notes.forEach(note => {
            const item = document.createElement("li");
            item.textContent = note.text;
            notesList.appendChild(item);
        });
    } catch (error) {
        notesStatus.textContent = "Error loading notes. Please try again.";
        console.error(error);
    }
});