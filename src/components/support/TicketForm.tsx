import { useState } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Send } from "lucide-react";

export function TicketForm() {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 1500);
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Create a Ticket</h3>
      <p className="text-sm text-slate-500 mb-5">Our support team typically responds within 2 hours.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="subject"
          label="Subject"
          placeholder="Brief description of your issue"
          required
        />
        <Select
          id="category"
          label="Category"
          options={[
            { value: "", label: "Select a category" },
            { value: "technical", label: "Technical Issue" },
            { value: "billing", label: "Billing Question" },
            { value: "general", label: "General Inquiry" },
            { value: "feature-request", label: "Feature Request" },
          ]}
          required
        />
        <Select
          id="priority"
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