import { useState, useRef } from 'react';
import { useAuthStore } from '../store/auth-store';

declare global { interface Window { __env__?: { API_URL?: string; POSTGREST_URL?: string } } }
const API_URL = window.__env__?.API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const conversationId = useRef<string | undefined>(undefined);
  const token = useAuthStore((s) => s.token);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setError('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, conversation_id: conversationId.current }),
      });

      const data = await res.json() as { message?: string; conversation_id?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Error al contactar el servidor'); return; }

      conversationId.current = data.conversation_id;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.message! }]);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    conversationId.current = undefined;
  };

  return { messages, loading, error, sendMessage, clearChat };
}
