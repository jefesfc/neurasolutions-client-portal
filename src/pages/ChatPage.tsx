import { useState, useRef, useEffect } from "react";
import { Send, Bot, Plus, User } from "lucide-react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { useChat } from "../hooks/useChat";

const SUGGESTIONS = [
  "¿Cuántos leads tenemos en total y cuántos hemos ganado?",
  "Dame un resumen del pipeline de ventas",
  "¿Cuál es nuestro ratio de conversión?",
  "Muéstrame los leads más recientes",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-brand-600" />
      </div>
      <div className="bg-white border border-surface-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-surface-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, loading, error, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <PageTransition>
      <PageHeader
        title="AI Assistant"
        description="Consulta datos de negocio en lenguaje natural"
        actions={
          <Button variant="outline" size="sm" onClick={clearChat} disabled={isEmpty && !error}>
            <Plus className="h-3.5 w-3.5" />
            Nueva conversación
          </Button>
        }
      />

      <div className="flex flex-col h-[calc(100vh-13rem)] bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Bot className="h-8 w-8 text-brand-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900 mb-1">¿En qué puedo ayudarte?</h3>
                <p className="text-sm text-surface-400 max-w-xs">
                  Pregúntame sobre leads, contactos, métricas o el estado del negocio.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-sm px-3 py-2 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user"
                      ? "bg-brand-500"
                      : "bg-brand-100"
                  }`}>
                    {msg.role === "user"
                      ? <User className="h-4 w-4 text-white" />
                      : <Bot className="h-4 w-4 text-brand-600" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-white border border-surface-200 text-surface-800 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && <TypingIndicator />}

              {error && (
                <div className="flex justify-center">
                  <span className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</span>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-surface-100 p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              loading={loading}
              className="flex-shrink-0 h-11 w-11 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-surface-400 mt-2 pl-1">
            Shift+Enter para nueva línea · los datos se consultan en tiempo real
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
