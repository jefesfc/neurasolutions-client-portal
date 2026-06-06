import { useState } from "react";
import { Send, Clock, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import type { ChatMessage } from "../../types";

const initialMessages: ChatMessage[] = [
  { id: "1", sender: "support", content: "Hi! I'm your NeuraSolutions support assistant. How can I help you today?", timestamp: new Date().toISOString() },
];

export function ChatSupport() {
  const [messages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    setInput("");
  }

  return (
    <Card className="flex flex-col h-[500px]" padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-brand-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">NeuraSolutions Support</p>
          <p className="text-xs text-positive flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Online
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.sender === "client" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.sender === "client"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-700 rounded-bl-md"
              )}
            >
              <p>{msg.content}</p>
              <span className={cn("text-[10px] mt-1 block", msg.sender === "client" ? "text-white/70" : "text-slate-400")}>
                <Clock className="h-3 w-3 inline mr-1" />
                Just now
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <Button size="md" onClick={handleSend} className="rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}