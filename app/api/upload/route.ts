import {
    BlobServiceClient,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = "medico";

const defaultAzureCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
);

const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    defaultAzureCredential
);

export async function POST(req: NextRequest) {
    const formdata = await req.formData();

    const file = formdata.get("file") as File;

    if (!file) {
        return new Response("No file uploaded", { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
        return new Response("File is too large", { status: 400 });
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpg",
        "application/msword",
    ];

    if (!allowedTypes.includes(file.type)) {
        return new Response("File type is not allowed", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const blobName = `${uuid()}-${file.name}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: file.type },
    });
}
