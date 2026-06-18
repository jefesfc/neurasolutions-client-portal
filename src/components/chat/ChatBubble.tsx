import { useState, useRef, useEffect } from "react";
import { Send, Bot, Plus, User, X, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "../../hooks/useChat";
import { cn } from "../../lib/cn";
import { ReportMessage } from "./ReportMessage";

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** patterns
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// Detect "**Label:** value" pattern — renders label in indigo, value in slate
function renderLabelValue(text: string): React.ReactNode {
  const match = text.match(/^\*\*(.+?):\*\*\s*(.*)$/);
  if (match) {
    return (
      <>
        <span className="font-semibold text-indigo-600">{match[1]}</span>
        <span className="text-slate-500 font-normal">: </span>
        <span className="text-slate-800">{match[2]}</span>
      </>
    );
  }
  return <>{renderInline(text)}</>;
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;
  const listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={key++} className="space-y-1.5 my-2 pl-0.5">
          {listItems.splice(0)}
        </ul>
      );
    }
  };

  for (const line of lines) {
    const isHeader = /^#{1,3}\s/.test(line);
    const isBullet = /^[-•]\s/.test(line);
    // Line that is ONLY **bold** — treat as a name/title heading
    const isBoldTitle = /^\*\*[^*]+\*\*$/.test(line.trim());

    if (isBoldTitle) {
      flushList();
      const name = line.trim().slice(2, -2);
      nodes.push(
        <p key={key++} className="text-[14px] font-bold text-slate-900 leading-tight mb-0.5">
          {name}
        </p>
      );
    } else if (isHeader) {
      flushList();
      const text = line.replace(/^#{1,3}\s/, "");
      nodes.push(
        <p key={key++} className="text-[10.5px] font-semibold text-indigo-500 uppercase tracking-wider mt-3 mb-1 first:mt-0">
          {text}
        </p>
      );
    } else if (isBullet) {
      const inner = line.replace(/^[-•]\s/, "");
      listItems.push(
        <li key={key++} className="flex items-start gap-2.5">
          <span className="mt-[6px] h-1 w-1 rounded-full bg-indigo-400 flex-shrink-0" />
          <span className="leading-relaxed text-[13px]">{renderLabelValue(inner)}</span>
        </li>
      );
    } else {
      flushList();
      if (line.trim() === "") {
        nodes.push(<div key={key++} className="h-1.5" />);
      } else {
        nodes.push(
          <p key={key++} className="leading-relaxed text-slate-700 text-[13px]">
            {renderInline(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return <div className="space-y-0.5">{nodes}</div>;
}

const SUGGESTIONS = [
  "How many leads do we have this month?",
  "Show me upcoming calendar events",
  "What's our conversion rate?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-3.5 w-3.5 text-indigo-500" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-3.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={fullscreen ? {
              position: 'fixed', bottom: 0, right: 0, top: 0, left: 0,
              width: '100vw', height: '100vh', zIndex: 9999,
              borderRadius: 0,
            } : { transformOrigin: "bottom right" }}
            className={fullscreen
              ? "bg-slate-50 flex flex-col overflow-hidden"
              : "fixed bottom-20 right-6 z-50 w-[400px] h-[560px] bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(99,102,241,0.18),0_2px_16px_-4px_rgba(0,0,0,0.10)] border border-slate-200 flex flex-col overflow-hidden"
            }
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 flex-shrink-0">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-none">AIOS</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <p className="text-[11px] text-white/70">AI Chief of Staff · live data</p>
                </div>
              </div>
              <button onClick={clearChat} aria-label="New conversation"
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <Plus className="h-3.5 w-3.5 text-white" />
              </button>
              <button onClick={() => setFullscreen(v => !v)} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5 text-white" /> : <Maximize2 className="h-3.5 w-3.5 text-white" />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className={cn("flex-1 overflow-y-auto bg-slate-50", fullscreen && "flex flex-col items-center")}>
              <div className={cn("p-4 space-y-4 w-full", fullscreen && "max-w-3xl")}>
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center h-full gap-5 text-center pt-8">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">How can I help you?</h3>
                      <p className="text-xs text-slate-400">Ask about clients, calendar, revenue, or anything.</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                          className="text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all text-left shadow-sm">
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
                        <div key={msg.id} className={cn("flex items-end gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                            msg.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                              : "bg-indigo-50 border border-indigo-100"
                          )}>
                            {msg.role === "user"
                              ? <User className="h-3.5 w-3.5 text-white" />
                              : <Bot className="h-3.5 w-3.5 text-indigo-500" />
                            }
                          </div>

                          {isReport ? (
                            <div className="max-w-[95%]">
                              <ReportMessage report={msg.report_data!} />
                            </div>
                          ) : msg.role === "user" ? (
                            <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-br-sm text-[13px] leading-relaxed whitespace-pre-wrap bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200">
                              {msg.content}
                            </div>
                          ) : (
                            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-slate-200/80 shadow-sm">
                              <MarkdownMessage content={msg.content} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {loading && <TypingIndicator />}
                    {error && (
                      <div className="flex justify-center">
                        <span className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
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
            <div className={cn("border-t border-slate-200 bg-white flex-shrink-0", fullscreen && "flex justify-center")}>
              <div className={cn("p-3 w-full", fullscreen && "max-w-3xl")}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all max-h-24 overflow-y-auto"
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || loading}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                      input.trim() && !loading
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
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
          <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-30" />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          style={{ height: 52, width: 52 }}
          className={cn(
            "relative rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 transition-all duration-200",
            open
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="h-5 w-5 text-white" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Bot className="h-5 w-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
