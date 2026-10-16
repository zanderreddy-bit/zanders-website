document.getElementById("loadNotes").addEventListener("click", async () => {
    const response = await fetch("/api/notes");
    const notes = await response.json();

    const list = document.getElementById("notesList");
    list.replaceChildren();

    notes.forEach(note => {
        const item = document.createElement("li");
        item.textContent = note.text;
        list.appendChild(item);
    });
});