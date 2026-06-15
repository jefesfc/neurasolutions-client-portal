import { useState } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Send } from "lucide-react";
import { useAuthStore } from "../../store/auth-store";
import { useTranslations } from "../../i18n/useT";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface Props {
  onCreated?: () => void;
}

export function TicketForm({ onCreated }: Props) {
  const token = useAuthStore((s) => s.token);
  const T = useTranslations();
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
          <h3 className="text-lg font-semibold text-slate-800 mb-1">{T.support.successTitle}</h3>
          <p className="text-sm text-slate-500">{T.support.successDesc}</p>
          <button
            className="mt-4 text-sm text-brand-600 hover:underline"
            onClick={() => setSuccess(false)}
          >
            {T.support.submitAnother}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{T.support.formTitle}</h3>
      <p className="text-sm text-slate-500 mb-5">{T.support.formDesc}</p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="subject"
          name="subject"
          label={T.support.subjectLabel}
          placeholder={T.support.subjectPh}
          required
        />
        <Select
          id="category"
          name="category"
          label={T.support.categoryLabel}
          options={[
            { value: "general",         label: T.support.catGeneral   },
            { value: "technical",       label: T.support.catTechnical },
            { value: "billing",         label: T.support.catBilling   },
            { value: "feature-request", label: T.support.catFeature   },
          ]}
          required
        />
        <Select
          id="priority"
          name="priority"
          label={T.support.priorityLabel}
          options={[
            { value: "low",      label: T.support.priLow      },
            { value: "medium",   label: T.support.priMedium   },
            { value: "high",     label: T.support.priHigh     },
            { value: "critical", label: T.support.priCritical },
          ]}
          required
        />
        <Textarea
          id="description"
          name="description"
          label={T.support.descLabel}
          placeholder={T.support.descPh}
          rows={5}
          required
        />
        <Button type="submit" loading={submitting} className="w-full">
          <Send className="h-4 w-4" />
          {T.support.submitBtn}
        </Button>
      </form>
    </Card>
  );
}
