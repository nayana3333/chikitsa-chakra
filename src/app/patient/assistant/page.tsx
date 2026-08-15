import { requirePatient } from "@/lib/auth/dal";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page";
import { AssistantChat } from "./chat";

export const metadata = { title: "Ask Ayurveda" };

export default async function AssistantPage() {
  await requirePatient();

  // Read on the server and pass down — ANTHROPIC_API_KEY must never reach the
  // client bundle, so the client only learns whether a key exists, not its value.
  const aiConfigured = isAiConfigured();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Ask Ayurveda"
        description="An assistant for understanding your treatment — what a procedure involves, what the doshas mean, and how to prepare."
      />
      <AssistantChat aiConfigured={aiConfigured} />
    </div>
  );
}
