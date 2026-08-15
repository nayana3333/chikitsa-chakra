import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth/dal";
import {
  getAiClient,
  isAiConfigured,
  AI_MODEL,
  PATIENT_ASSISTANT_SYSTEM,
} from "@/lib/ai/client";
import { demoAnswerFor } from "@/lib/ai/demo-responses";

/**
 * Streaming endpoint for the patient assistant.
 *
 * A Route Handler rather than a Server Action because the response is a token
 * stream — Server Actions return a single value, so the reply would only
 * appear once it was complete.
 */

const bodySchema = z.object({
  threadId: z.string().nullable().optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  // Route Handlers are public HTTP endpoints — authenticate here, exactly as
  // a page would. Nothing about being under /api makes this internal.
  const { user } = await requirePatient();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { message } = parsed.data;

  // Reuse the caller's thread only after confirming they own it — otherwise a
  // guessed id would append to (and read back) someone else's conversation.
  let thread = parsed.data.threadId
    ? await db.chatThread.findFirst({
        where: { id: parsed.data.threadId, userId: user.id },
        select: { id: true },
      })
    : null;

  thread ??= await db.chatThread.create({
    data: {
      userId: user.id,
      title: message.slice(0, 60),
    },
    select: { id: true },
  });

  const history = await db.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });

  await db.chatMessage.create({
    data: { threadId: thread.id, role: "USER", content: message },
  });

  const threadId = thread.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The thread id rides in a header rather than the body so the client can
      // adopt it before the first token arrives.
      let full = "";

      const persist = async () => {
        await db.chatMessage.create({
          data: { threadId, role: "ASSISTANT", content: full },
        });
        await db.chatThread.update({
          where: { id: threadId },
          data: { updatedAt: new Date() },
        });
      };

      const client = getAiClient();

      if (!client) {
        // Demo mode: stream the scripted answer word by word so the UI path
        // exercised here is identical to the live one.
        const answer = demoAnswerFor(message);
        for (const word of answer.split(/(\s+)/)) {
          full += word;
          controller.enqueue(encoder.encode(word));
          await new Promise((r) => setTimeout(r, 12));
        }
        await persist();
        controller.close();
        return;
      }

      try {
        const aiStream = client.messages.stream({
          model: AI_MODEL,
          // Deliberately short: this is a patient-facing chat reply, not a
          // long-form document.
          max_tokens: 2048,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: [
            {
              type: "text",
              text: PATIENT_ASSISTANT_SYSTEM,
              // The system prompt is stable across every request, so caching
              // it makes each turn cheaper after the first.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            ...history.map((m) => ({
              role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
              content: m.content,
            })),
            { role: "user" as const, content: message },
          ],
        });

        for await (const event of aiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await aiStream.finalMessage();

        // Safety classifiers can decline a request; that arrives as a normal
        // response with stop_reason "refusal" and empty content, not an error.
        if (final.stop_reason === "refusal" && !full) {
          full =
            "I'm not able to help with that one. If it concerns your treatment, please raise it with your doctor through the app.";
          controller.enqueue(encoder.encode(full));
        }

        await persist();
      } catch (error) {
        console.error("Assistant stream failed:", error);

        const notice =
          error instanceof Anthropic.RateLimitError
            ? "\n\n_The assistant is busy right now — please try again in a moment._"
            : "\n\n_The assistant is unavailable right now. Your message has been saved._";

        full += notice;
        controller.enqueue(encoder.encode(notice));
        await persist().catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Thread-Id": threadId,
      "X-Ai-Mode": isAiConfigured() ? "live" : "demo",
    },
  });
}
