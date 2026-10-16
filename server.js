
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

// Read form submissions and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from public/
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Store uploaded files in memory before sending to Backblaze
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Example notes (cleared when server restarts)
const notes = [];

// Escape user input before placing it into HTML
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

// API: Return website name for the class website
app.get("/api/getName", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ name: "Bunner" });
});

// API: Return an image for the class website
app.get("/api/getImage", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    res.sendFile(
        path.join(publicDir, "images", "notes.jpg"),
        (err) => {
            if (err) {
                console.error("Could not send image:", err);

                if (!res.headersSent) {
                    res.status(404).send("Image not found.");
                }
            }
        }
    );
});

// Route parameter example: /hello/Alex
app.get("/hello/:name", (req, res) => {
    res.send(`Hello, ${escapeHtml(req.params.name)}!`);
});

// Query parameter example: /search?term=hello
app.get("/search", (req, res) => {
    const term = req.query.term || "";

    if (typeof term !== "string") {
        return res.status(400).send("Invalid search term.");
    }

    res.send(`You searched for: ${escapeHtml(term)}`);
});

// Save a note from an HTML form
app.post("/notes", (req, res) => {
    const noteText = req.body.note;

    if (typeof noteText !== "string" || !noteText.trim()) {
        return res.status(400).json({
            error: "Please enter a note."
        });
    }

    const note = {
        id: notes.length + 1,
        text: noteText.trim()
    };

    notes.push(note);

    // Send JSON back to the AJAX request
    res.status(201).json(note);
});

// AJAX endpoint: Return notes as JSON
app.get("/api/notes", (req, res) => {
    res.json(notes);
});

// Upload a file to Backblaze B2
app.post("/upload", upload.single("myFile"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).send("Please select a file.");
        }

        const key = await uploadFile(req.file);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Upload Complete</title>
            </head>
            <body>
                <h1>Upload successful!</h1>
                <p>File: ${escapeHtml(req.file.originalname)}</p>
                <p>Your file is stored in Backblaze B2.</p>
                <p>
                    <a href="/file-download?key=${encodeURIComponent(key)}">
                        Download your file
                    </a>
                </p>
                <p><a href="/">Return home</a></p>
            </body>
            </html>
        `);
    } catch (err) {
        next(err);
    }
});

// Generate a temporary signed URL and redirect to Backblaze
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
        res.redirect(url);
    } catch (err) {
        next(err);
    }
});

// Test the custom 500 handler
app.get("/test-error", (req, res, next) => {
    next(new Error("Test server error."));
});

// Custom 404 handler (must be after all normal routes)
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p><a href="/">Return home</a></p>
    `);
});

// Custom error handler (must be last)
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).send(
            "Upload failed. The file must be no larger than 5 MB."
        );
    }

    res.status(500).send(
        "500 - Server Error. Check the server logs."
    );
});

// Render supplies PORT; listen on all network interfaces
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});