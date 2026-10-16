const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");


const requiredKeys = [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_ENDPOINT",
    "B2_REGION",
    "B2_BUCKET"
];

const missingKeys = requiredKeys.filter(
    key => !process.env[key] || !process.env[key].trim()
);

console.log(
    "Backblaze environment check:",
    missingKeys.length === 0
        ? "All five variables are present."
        : `Missing or empty: ${missingKeys.join(", ")}`
);














const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");
const { randomUUID } = require("crypto");

// Backblaze B2 S3-compatible connection
const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY
    },
    forcePathStyle: true
});

const bucket = process.env.B2_BUCKET;

// Upload a file to Backblaze
async function uploadFile(file) {
    if (
        !process.env.B2_ENDPOINT ||
        !process.env.B2_REGION ||
        !process.env.B2_KEY_ID ||
        !process.env.B2_APPLICATION_KEY ||
        !bucket
    ) {
        throw new Error("Backblaze environment variables are not configured.");
    }

    // Create a safe, unique object name
    const originalName = path.basename(file.originalname)
        .replace(/[^a-zA-Z0-9._-]/g, "_");

    const key = `uploads/${randomUUID()}-${originalName}`;

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));

    return key;
}

// Create a signed download link that expires after 10 minutes
async function createDownloadUrl(key) {
    if (!bucket) {
        throw new Error("B2_BUCKET is not configured.");
    }

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    return getSignedUrl(s3, command, {
        expiresIn: 600
    });
}

module.exports = {
    uploadFile,
    createDownloadUrl
};