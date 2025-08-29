"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import axios from "axios";

export default function Chat() {
    const [input, setInput] = useState("");
    const { messages, sendMessage, setMessages } = useChat();
    return (
        <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
            {messages.map((message) => (
                <div key={message.id} className="whitespace-pre-wrap">
                    {message.role === "user" ? "User: " : "AI: "}
                    {message.parts.map((part, i) => {
                        switch (part.type) {
                            case "text":
                                return (
                                    <div key={`${message.id}-${i}`}>
                                        {part.text}
                                    </div>
                                );
                        }
                    })}
                </div>
            ))}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage({ text: input });
                    setInput("");
                }}
                className="flex items-center gap-2 fixed bottom-0 w-full max-w-md mb-8"
            >
                <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white cursor-pointer hover:bg-blue-700 mr-2"
                >
                    <span className="text-2xl leading-none">+</span>
                    <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                            const imageFile = e.target.files?.[0];
                            if (!imageFile) {
                                return;
                            }

                            const formdata = new FormData();

                            formdata.append("image", imageFile);

                            const res = await axios.post(
                                "/api/image-parser",
                                formdata
                            );

                            const response = res.data;
                            console.log("Response from API:", response);
                            //     setMessages((prevMessages) => [
                            //         ...prevMessages,
                            //         {
                            //             id: Date.now().toString(),
                            //             role: "assistant",
                            //             parts: [
                            //                 {
                            //                     type: "text",
                            //                     text: response[0].content[0].text,
                            //                 },
                            //             ],
                            //         },
                            //     ]);
                        }}
                    />
                </label>
                <input
                    className="flex-1 dark:bg-zinc-900 p-2 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
                    value={input}
                    placeholder="Say something..."
                    onChange={(e) => setInput(e.currentTarget.value)}
                />
            </form>
        </div>
    );
}
