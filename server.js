

require("dotenv").config();

const {
    uploadFile,
    createDownloadUrl
} = require("./storage");

// Read normal form submissions and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve files from public/
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Multer keeps the file in memory for Backblaze
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Example notes (reset when the server restarts)
const notes = [];

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// Route parameter: /hello/Alex
app.get("/hello/:name", (req, res) => {
    res.send(`Hello, ${escapeHtml(req.params.name)}!`);
});

// Query parameter: /search?term=hello
app.get("/search", (req, res) => {
    const term = req.query.term || "";

    if (typeof term !== "string") {
        return res.status(400).send("Invalid search term.");
    }

    res.send(`You searched for: ${escapeHtml(term)}`);
});

// HTML form submission
app.post("/notes", (req, res) => {
    const noteText = req.body.note;

    if (typeof noteText !== "string" || !noteText.trim()) {
        return res.status(400).send("Please enter a note.");
    }

    const note = {
        id: notes.length + 1,
        text: noteText.trim()
    };

    notes.push(note);

    res.send(`
        <h1>Note saved!</h1>
        <p>${escapeHtml(note.text)}</p>
        <a href="/">Go back</a>
    `);
});

// AJAX endpoint
app.get("/api/notes", (req, res) => {
    res.json(notes);
});

// Upload directly to Backblaze B2
app.post("/upload", upload.single("myFile"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).send("Please select a file.");
        }

        // Pass the Multer buffer to storage.js
        const key = await uploadFile(req.file);

        res.send(`
            <h1>Upload successful!</h1>
            <p>File: ${escapeHtml(req.file.originalname)}</p>
            <p>Your file is stored in Backblaze B2.</p>
            <a href="/file-download?key=${encodeURIComponent(key)}">
                Download your file
            </a>
            <p><a href="/">Return home</a></p>
        `);
    } catch (err) {
        next(err);
    }
});

// Redirect the browser to Backblaze
app.get("/file-download", async (req, res, next) => {
    try {
        const key = req.query.key;

        if (
            typeof key !== "string" ||
            !key.startsWith("uploads/") ||
            key.includes("..")
        ) {
            return res.status(400).send("Invalid file key.");
        }

        const url = await createDownloadUrl(key);

        // Backblaze serves the file, not Render
        res.redirect(url);
    } catch (err) {
        next(err);
    }
});

// Test the 500 handler
app.get("/test-error", (req, res, next) => {
    next(new Error("Test server error."));
});

// Custom 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <a href="/">Return home</a>
    `);
});

// Custom 500 handler
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).send(
            "Upload failed. Check that the file is no larger than 5 MB."
        );
    }

    res.status(500).send(
        "500 - Server Error. Check the server logs."
    );
});

// Render needs the assigned port and an external interface
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});