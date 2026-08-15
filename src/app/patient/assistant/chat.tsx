"use client";

import * as React from "react";
import { Send, Sparkles, User as UserIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What do Vata, Pitta and Kapha actually mean?",
  "What are the three phases of Panchakarma?",
  "How should I prepare for tomorrow's session?",
  "What's the difference between Prakriti and Vikriti?",
];

export function AssistantChat({ aiConfigured }: { aiConfigured: boolean }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const threadId = React.useRef<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput("");
    setStreaming(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    const assistantId = crypto.randomUUID();

    setMessages((m) => [
      ...m,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: threadId.current, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      threadId.current = res.headers.get("X-Thread-Id") ?? threadId.current;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // Append each chunk to the placeholder message as it arrives, so text
      // renders progressively rather than appearing all at once at the end.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the assistant. Please try again.");
      setMessages((m) => m.filter((msg) => msg.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-border bg-card">
      {/* Transcript */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <h2 className="font-serif text-xl font-semibold">
              Ask about your care
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              I can explain Ayurvedic concepts and help you prepare for
              sessions. For anything about your diagnosis or a change to your
              treatment, speak to your doctor.
            </p>

            <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {m.content ? (
                  <Markdownish text={m.content} />
                ) : (
                  <span className="inline-flex gap-1 py-1" aria-label="Thinking">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 animate-bounce rounded-full bg-current opacity-60"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {m.role === "user" && (
                <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <UserIcon className="size-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mx-5 mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/8 p-2.5 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-4"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter adds a newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about a procedure, a dosha, or how to prepare…"
            rows={1}
            className="max-h-32 min-h-11 resize-none"
            disabled={streaming}
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            disabled={!input.trim() || streaming}
            aria-label="Send message"
          >
            <Send />
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Not a substitute for your doctor&apos;s advice.
          </p>
          <Badge variant={aiConfigured ? "success" : "warning"}>
            {aiConfigured ? "Live" : "Demo mode"}
          </Badge>
        </div>
      </form>
    </div>
  );
}

/**
 * Minimal inline renderer for the small subset of Markdown the assistant is
 * asked to use — bold, italic, and paragraph breaks. Deliberately not a full
 * Markdown parser: rendering model output as HTML is an injection risk, so
 * this only ever produces text nodes and <strong>/<em> elements.
 */
function Markdownish({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
              return (
                <em key={j} className="opacity-80">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <React.Fragment key={j}>{part}</React.Fragment>;
          })}
        </p>
      ))}
    </>
  );
}
