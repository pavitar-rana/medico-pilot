"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<unknown>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post("/api/extract", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setResult(res.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setResult({ error: error.response?.data || error.message });
            } else if (error instanceof Error) {
                setResult({ error: error.message });
            } else {
                setResult({ error: "An unknown error occurred" });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">📄 OCR Medical Receipt</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                    {loading ? "Processing..." : "Upload & Analyze"}
                </button>
            </form>

            {result !== null && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-lg font-semibold">Result:</h2>
                    <pre className="text-sm whitespace-pre-wrap">
                        {typeof result === "string"
                            ? result
                            : JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </main>
    );
}
