require("dotenv").config();

const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Client definition
const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY
    },
    forcePathStyle: true
});

// Bucket to use
const bucket = process.env.B2_BUCKET;

// Upload function
async function uploadFile(key, body, contentType) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
    });

    await s3.send(command);
}

// Create a signed download URL (10 minutes)
async function createDownloadUrl(key) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    return await getSignedUrl(s3, command, {
        expiresIn: 600
    });
}

module.exports = {
    uploadFile,
    createDownloadUrl
};