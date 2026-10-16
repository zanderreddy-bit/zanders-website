const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");
const { randomUUID } = require("crypto");

// Backblaze B2 connection
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

// Upload the Multer file buffer to Backblaze
async function uploadFile(file) {
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

// Create a temporary download link
async function createDownloadUrl(key) {
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