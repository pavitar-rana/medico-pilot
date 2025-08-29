import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import nlemData from "@/public/nlem2022.json";

import Fuse from "fuse.js"; // for fuzzy matching

// Zod schema for medicine extraction
const MedicineSchema = z.object({
    name: z.string().describe("The name of the medicine"),
    dosage: z.string().describe("The dosage amount (e.g., '50 µg', '10 mg')"),
    frequency: z
        .string()
        .describe(
            "How often to take the medicine (e.g., '1x daily', 'twice daily')"
        ),
    notes: z
        .string()
        .optional()
        .describe("Any additional notes or instructions"),
    generics: z
        .array(
            z.object({
                name: z.string().describe("The name of the generic medicine"),
                //     rxcui: z
                //         .string()
                //         .optional()
                //         .describe("The RxCUI of the generic medicine"),
            })
        )
        .describe("Array of generic names for the medicine"),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence score between 0 and 1"),
});

const MedicinesExtractionSchema = z.object({
    medicines: z
        .array(MedicineSchema)
        .describe("Array of extracted medicines from the image"),
});

// Type for normalized medicine
type NormalizedMedicine = z.infer<typeof MedicineSchema> & {
    raw: string;
    normalized: string | null;
    rxcui: string | null;
    generics: { name: string; rxcui?: string }[];
};

// ----------------- Load NLEM dataset -----------------

// fuzzy search config
const fuse = new Fuse(nlemData, {
    keys: ["name"],
    threshold: 0.5,
});

// ----------------- RxNorm Helpers -----------------
async function getGenerics(rxcui: string) {
    try {
        const response = await axios.get(
            `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=IN`
        );
        const related = response.data?.relatedGroup?.conceptGroup;
        if (!related) return [];
        const ingredients = related
            .flatMap((g: any) => g.conceptProperties || [])
            .map((p: any) => ({ name: p.name, rxcui: p.rxcui }));
        return ingredients;
    } catch {
        return [];
    }
}

async function normalizeDrugName(drugName: string) {
    const baseUrl = "https://rxnav.nlm.nih.gov/REST";

    try {
        const response = await axios.get(
            `${baseUrl}/approximateTerm.json?term=${encodeURIComponent(
                drugName
            )}&maxEntries=1`
        );
        const candidate = response.data?.approximateGroup?.candidate?.[0];
        if (!candidate?.rxcui) {
            return {
                raw: drugName,
                normalized: null,
                rxcui: null,
                generics: [],
            };
        }

        const rxcui = candidate.rxcui;
        const normalized = candidate.rxnormName;
        const generics = await getGenerics(rxcui);

        return {
            raw: drugName,
            normalized,
            rxcui,
            generics,
        };
    } catch (err) {
        console.error("RxNorm error:", err);
        return { raw: drugName, normalized: null, rxcui: null, generics: [] };
    }
}

// ----------------- Indian NLEM Fallback -----------------
function normalizeWithNLEM(drugName: string) {
    const results = fuse.search(drugName);
    if (results.length > 0) {
        const match = results[0].item;
        return {
            raw: drugName,
            normalized: match.name,
            rxcui: null,
            generics: [{ name: match.name }],
            dosageForms: match.dosageForms,
            source: "NLEM",
        };
    }
    return null;
}

// ----------------- API Handler -----------------
export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get("image") as File | null;

        if (!imageFile) {
            return NextResponse.json(
                { error: "No image file provided" },
                { status: 400 }
            );
        }

        if (!imageFile.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload an image." },
                { status: 400 }
            );
        }

        const maxSize = 10 * 1024 * 1024;
        if (imageFile.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 10MB." },
                { status: 400 }
            );
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");

        const result = await generateObject({
            model: google("gemini-2.5-pro"),
            schema: MedicinesExtractionSchema,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "image", image: base64Image },
                        {
                            type: "text",
                            text: "Extract all medicines from this prescription image. For each medicine, identify the name, dosage, frequency, any notes, and provide a confidence score. Most importantly provide generic names as well that are relevant to India.",
                        },
                    ],
                },
            ],
        });

        const medicines = result.object.medicines;

        return NextResponse.json({ extracted: medicines });
    } catch (error) {
        console.error("Error processing image:", error);
        return NextResponse.json(
            { error: "Internal server error while processing image" },
            { status: 500 }
        );
    }
}
