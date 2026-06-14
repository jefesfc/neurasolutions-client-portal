import { useState, useRef, useEffect } from "react";
import { Send, Bot, Plus, User, X, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "../../hooks/useChat";
import { cn } from "../../lib/cn";
import { ReportMessage } from "./ReportMessage";

const SUGGESTIONS = [
  "How many leads do we have this month?",
  "Show me upcoming calendar events",
  "What's our conversion rate?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-3.5 w-3.5 text-brand-600" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-1 h-3.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { messages, loading, error, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(id);
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={fullscreen ? {
              position: 'fixed', bottom: 0, right: 0, top: 0, left: 0,
              width: '100vw', height: '100vh', zIndex: 9999,
              borderRadius: 0,
            } : { transformOrigin: "bottom right" }}
            className={fullscreen
              ? "bg-white flex flex-col overflow-hidden"
              : "fixed bottom-20 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            }
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 flex-shrink-0">
              <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-none">AIOS</p>
                <p className="text-[11px] text-white/70 mt-0.5">AI Business Assistant</p>
              </div>
              <button
                onClick={clearChat}
                aria-label="New conversation"
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
              </button>
              <button
                onClick={() => setFullscreen(v => !v)}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5 text-white" /> : <Maximize2 className="h-3.5 w-3.5 text-white" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className={cn("flex-1 overflow-y-auto", fullscreen && "flex flex-col items-center")}>
              <div className={cn("p-4 space-y-4 w-full", fullscreen && "max-w-3xl")}>
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-brand-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">How can I help you?</h3>
                      <p className="text-xs text-slate-400">
                        Ask about leads, clients, calendar, or metrics.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setInput(s); inputRef.current?.focus(); }}
                          className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isReport = msg.role === 'assistant' && msg.response_type === 'report' && !!msg.report_data;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex items-end gap-2", msg.role === "user" && "flex-row-reverse")}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                            msg.role === "user" ? "bg-brand-500" : "bg-brand-100"
                          )}>
                            {msg.role === "user"
                              ? <User className="h-3.5 w-3.5 text-white" />
                              : <Bot className="h-3.5 w-3.5 text-brand-600" />
                            }
                          </div>
                          {isReport ? (
                            <div className="max-w-[95%]">
                              <ReportMessage report={msg.report_data!} />
                            </div>
                          ) : (
                            <div className={cn(
                              "max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm",
                              msg.role === "user"
                                ? "bg-brand-500 text-white rounded-br-sm"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                            )}>
                              {msg.content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {loading && <TypingIndicator />}
                    {error && (
                      <div className="flex justify-center">
                        <span className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                          {error}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div className={cn("border-t border-slate-100 flex-shrink-0", fullscreen && "flex justify-center")}>
              <div className={cn("p-3 w-full", fullscreen && "max-w-3xl")}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors max-h-24 overflow-y-auto"
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || loading}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                      input.trim() && !loading
                        ? "bg-brand-500 hover:bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 pl-0.5">
                  Shift+Enter for new line · real-time data
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!open && (
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-30" />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          style={{ height: 52, width: 52 }}
          className={cn(
            "relative rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
            open
              ? "bg-slate-700 hover:bg-slate-600"
              : "bg-brand-500 hover:bg-brand-600"
          )}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Bot className="h-5 w-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
