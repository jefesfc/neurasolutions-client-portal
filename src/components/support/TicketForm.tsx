import { useState } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Send } from "lucide-react";
import { useAuthStore } from "../../store/auth-store";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface Props {
  onCreated?: () => void;
}

export function TicketForm({ onCreated }: Props) {
  const token = useAuthStore((s) => s.token);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_URL}/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: fd.get("subject") as string,
          description: fd.get("description") as string,
          category: fd.get("category") as string,
          priority: fd.get("priority") as string,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to submit ticket");
      }
      setSuccess(true);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting ticket");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Ticket submitted</h3>
          <p className="text-sm text-slate-500">Our team will respond within 2 hours.</p>
          <button
            className="mt-4 text-sm text-brand-600 hover:underline"
            onClick={() => setSuccess(false)}
          >
            Submit another ticket
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Create a Ticket</h3>
      <p className="text-sm text-slate-500 mb-5">
        Our support team typically responds within 2 hours.
      </p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="subject"
          name="subject"
          label="Subject"
          placeholder="Brief description of your issue"
          required
        />
        <Select
          id="category"
          name="category"
          label="Category"
          options={[
            { value: "general", label: "General Inquiry" },
            { value: "technical", label: "Technical Issue" },
            { value: "billing", label: "Billing Question" },
            { value: "feature-request", label: "Feature Request" },
          ]}
          required
        />
        <Select
          id="priority"
          name="priority"
          label="Priority"
          options={[
            { value: "low", label: "Low — General question" },
            { value: "medium", label: "Medium — Needs attention" },
            { value: "high", label: "High — Business impact" },
            { value: "critical", label: "Critical — Service down" },
          ]}
          required
        />
        <Textarea
          id="description"
          name="description"
          label="Description"
          placeholder="Provide details about your issue..."
          rows={5}
          required
        />
        <Button type="submit" loading={submitting} className="w-full">
          <Send className="h-4 w-4" />
          Submit Ticket
        </Button>
      </form>
    </Card>
  );
}
