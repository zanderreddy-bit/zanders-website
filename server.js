require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    uploadFile,
    createDownloadUrl
} = require("./storage");

const app = express();
const PORT = process.env.PORT || 3000;

// Folders
const publicDir = path.join(__dirname, "public");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(publicDir));

// Check Backblaze configuration
const requiredVariables = [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_ENDPOINT",
    "B2_REGION",
    "B2_BUCKET"
];

const missingVariables = requiredVariables.filter(
    name => !process.env[name]
);

if (missingVariables.length > 0) {
    console.error(
        "Missing environment variables:",
        missingVariables.join(", ")
    );
}

// Multer keeps uploaded files in memory.
// Render does not need to store uploaded files locally.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Example notes (memory-only; reset when server restarts)
const notes = [];

// Escape user input before displaying it in HTML
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// HOME PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// ROUTE PARAMETER
// Example: /hello/Alex
app.get("/hello/:name", (req, res) => {
    res.send(`Hello, ${escapeHtml(req.params.name)}!`);
});

// QUERY PARAMETER
// Example: /search?term=javascript
app.get("/search", (req, res) => {
    const term = req.query.term || "";

    if (typeof term !== "string") {
        return res.status(400).send("Invalid search term.");
    }

    res.send(`You searched for: ${escapeHtml(term)}`);
});

// HTML FORM: SAVE NOTE
app.post("/notes", (req, res) => {
    const text = req.body.note;

    if (typeof text !== "string" || !text.trim()) {
        return res.status(400).send("Please enter a note.");
    }

    const note = {
        id: notes.length + 1,
        text: text.trim()
    };

    notes.push(note);

    res.send(`
        <h1>Note saved!</h1>
        <p>${escapeHtml(note.text)}</p>
        <a href="/">Go back</a>
    `);
});

// AJAX API: GET NOTES
app.get("/api/notes", (req, res) => {
    res.json(notes);
});

// UPLOAD FILE TO BACKBLAZE B2
app.post("/upload", upload.single("myFile"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).send("Please choose a file.");
        }

        // storage.js uploads the file buffer to Backblaze
        const key = await uploadFile(req.file);

        res.send(`
            <h1>Upload successful!</h1>
            <p>Your file has been saved to Backblaze B2.</p>
            <p>File: ${escapeHtml(req.file.originalname)}</p>
            <a href="/file-download?key=${encodeURIComponent(key)}">
                Download your file
            </a>
            <p><a href="/">Return home</a></p>
        `);
    } catch (err) {
        next(err);
    }
});

// CREATE A TEMPORARY BACKBLAZE DOWNLOAD LINK
app.get("/file-download", async (req, res, next) => {
    try {
        const key = req.query.key;

        // Only accept string keys inside our upload folder
        if (
            typeof key !== "string" ||
            !key.startsWith("uploads/") ||
            key.includes("..")
        ) {
            return res.status(400).send("Invalid file key.");
        }

        const downloadUrl = await createDownloadUrl(key);

        // Browser downloads directly from Backblaze
        res.redirect(downloadUrl);
    } catch (err) {
        next(err);
    }
});

// DOWNLOAD A SAMPLE FILE FROM THE PUBLIC FOLDER
app.get("/download", (req, res, next) => {
    res.download(
        path.join(publicDir, "download.txt"),
        "my-download.txt",
        err => {
            if (err && !res.headersSent) {
                next(err);
            }
        }
    );
});

// TEST CUSTOM 500 HANDLER
app.get("/test-error", (req, res, next) => {
    next(new Error("Test server error"));
});

// CUSTOM 404 HANDLER
// Keep this after all normal routes.
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The requested page does not exist.</p>
        <a href="/">Go home</a>
    `);
});

// CUSTOM 500 / ERROR HANDLER
// Express identifies error middleware by its four parameters.
app.use((err, req, res, next) => {
    console.error(err.stack || err.message);

    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).send(
            "Upload error. The file may exceed the 5 MB limit."
        );
    }

    res.status(500).send(`
        <h1>500 - Server Error</h1>
        <p>Something went wrong on the server.</p>
        <a href="/">Go home</a>
    `);
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});