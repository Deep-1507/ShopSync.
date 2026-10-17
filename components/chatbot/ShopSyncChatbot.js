
"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { faqData } from "./faqData";
import { MessageCircle, X, Send } from "lucide-react";

const suggestions = [
    "What is ShopSync?",
    "How do I add a product?",
    "How does delivery work?",
    "How do I manage inventory?",
];

function normalize(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getBotResponse(input) {
    const query = normalize(input);

    if (!query) {
        return "Please type a question so I can help.";
    }

    // Recognize greetings before searching the FAQ.
    if (
        /^(hi|hello|hey|hii|namaste|good morning|good evening)$/.test(
            query
        )
    ) {
        return "Hello! 👋 Welcome to ShopSync. Ask me about products, local shops, inventory, orders, delivery, or business accounts.";
    }

    let bestMatch = null;
    let bestScore = 0;

    const queryWords = new Set(
        query.split(" ").filter((word) => word.length > 1)
    );

    for (const item of faqData) {
        const question = normalize(item.question);
        const keywords = item.keywords.map(normalize);

        let score = 0;

        // Exact or near-exact question match.
        if (query === question) {
            score += 100;
        } else if (
            query.includes(question) ||
            question.includes(query)
        ) {
            score += 12;
        }

        // Match important words in the question.
        const questionWords = question.split(" ");

        for (const word of questionWords) {
            if (queryWords.has(word)) {
                score += word.length > 4 ? 3 : 1;
            }
        }

        // Match custom keywords and phrases.
        for (const keyword of keywords) {
            if (!keyword) continue;

            if (query.includes(keyword)) {
                score += keyword.includes(" ") ? 8 : 5;
            } else if (
                keyword.split(" ").some((word) =>
                    queryWords.has(word)
                )
            ) {
                score += 1;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    }

    // Avoid giving unrelated answers to unfamiliar questions.
    if (!bestMatch || bestScore < 4) {
        return "I'm not fully sure about that question yet. Try asking about ShopSync, products, inventory, orders, delivery, or business registration. You can also contact the ShopSync support team for help.";
    }

    return bestMatch.answer;
}

export default function ShopSyncChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hi! 👋 I'm the ShopSync Assistant. How can I help you today?",
        },
    ]);

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, isTyping]);

    const quickQuestions = useMemo(() => suggestions, []);

    function sendMessage(text = input) {
        const message = text.trim();

        if (!message || isTyping) return;

        setMessages((previous) => [
            ...previous,
            { role: "user", text: message },
        ]);

        setInput("");
        setIsTyping(true);

        // A short delay makes the interaction feel conversational.
        // The answer is still calculated locally.
        const reply = getBotResponse(message);

        setTimeout(() => {
            setMessages((previous) => [
                ...previous,
                { role: "bot", text: reply },
            ]);

            setIsTyping(false);
        }, 350);
    }

    return (
        <div className="fixed bottom-5 right-5 z-[100] font-sans">
            {isOpen && (
                <section
                    className="mb-4 flex h-[min(600px,75vh)] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-yellow-100 bg-white shadow-2xl"
                    aria-label="ShopSync chatbot"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between bg-yellow-500 px-4 py-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl">
                                🤖
                            </div>

                            <div>
                                <h2 className="font-semibold">
                                    ShopSync Assistant
                                </h2>
                                <p className="text-xs text-yellow-100">
                                    FAQ support · Available anytime
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg px-3 py-2 text-xl hover:bg-white/10"
                            aria-label="Close chat"
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4"
                        aria-live="polite"
                    >
                        {messages.map((message, index) => (
                            <div
                                key={`${index}-${message.role}`}
                                className={`flex ${message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user"
                                            ? "rounded-br-md bg-yellow-500 text-white"
                                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
                                        }`}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                    Finding an answer...
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Suggested questions */}
                    {messages.length === 1 && (
                        <div className="border-t border-slate-100 bg-white px-3 pt-3">
                            <p className="mb-2 text-xs font-medium text-slate-500">
                                Try asking
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {quickQuestions.map((question) => (
                                    <button
                                        key={question}
                                        type="button"
                                        onClick={() => sendMessage(question)}
                                        className="rounded-full border border-yellow-200 px-3 py-1.5 text-xs text-yellow-800 transition hover:bg-yellow-50"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <form
                        className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendMessage();
                        }}
                    >
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask about ShopSync..."
                            aria-label="Your question"
                            className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-100"
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-lg text-white transition hover:bg-yellow-800 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Send message"
                        >
                            <Send size={18} strokeWidth={2} />
                        </button>
                    </form>
                </section>
            )}

            {/* Floating chat button */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-yellow-800 focus:outline-none focus:ring-4 focus:ring-yellow-200"
                    aria-label={isOpen ? "Close ShopSync chat" : "Open ShopSync chat"}
                >
                    {isOpen ? (
                        <X size={25} strokeWidth={2} />
                    ) : (
                        <MessageCircle size={27} strokeWidth={2} />
                    )}
                </button>
            </div>
        </div>
    );
}
