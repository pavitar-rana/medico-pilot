// app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Make sure you have GOOGLE_APPLICATION_CREDENTIALS set in your .env
// Example: GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json

const client = new ImageAnnotatorClient();

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const [result] = await client.documentTextDetection({
            image: { content: buffer },
        });

        const fullTextAnnotation = result.fullTextAnnotation?.text || "";

        return NextResponse.json({ text: fullTextAnnotation });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "OCR failed", details: err },
            { status: 500 }
        );
    }
}
