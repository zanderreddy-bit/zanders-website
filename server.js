
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");

const {
    uploadFile,
    createDownloadUrl
} = require("./storage");

const app = express();
const PORT = process.env.PORT || 3000;

// Read form submissions and JSON files 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from public/
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Stores uploaded files in memory before sending to Backblaze
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

//  notes 
const notes = [];

// wscape user input before placing it into HTML zander dont move has to be above most stuff
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

// api name
app.get("/api/getName", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ name: "Bunner" });
});

// api bunny imge
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

// Routes parameter  aka hello and alex
app.get("/hello/:name", (req, res) => {
    res.send(`Hello, ${escapeHtml(req.params.name)}!`);
});

// Query parameter does the search?term=hello
app.get("/search", (req, res) => {
    const term = req.query.term || "";

    if (typeof term !== "string") {
        return res.status(400).send("Invalid search term.");
    }

    res.send(`You searched for: ${escapeHtml(term)}`);
});

// save  notes from an HTML form
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

    // Send JSON back to the AJAX \
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

        // Create a safe, unique filename
        const originalName = path.basename(req.file.originalname)
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        const key = `uploads/${randomUUID()}-${originalName}`;

        // Upload using the key, file buffer, and content type
        await uploadFile(
            key,
            req.file.buffer,
            req.file.mimetype
        );

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

// Generate a temporary 10 min
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

// Custom 404 handler 
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p><a href="/">Return home</a></p>
    `);
});

// Custom error handler last one 
// Custom error handler last one
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    // Handle Multer errors, including files that are too large
    if (err instanceof multer.MulterError) {
        return res.status(400).send(
            "400 - Bad Request. Upload failed. The file must be no larger than 5 MB."
        );
    }

    // Handle other errors marked as 400
    if (err.status === 400 || err.statusCode === 400) {
        return res.status(400).send(
            "400 - Bad Request. Check your request and try again."
        );
    }

    // Handle all other server errors
    res.status(500).send(
        "500 - Server Error. Check the server logs."
    );
});
// ports 
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});