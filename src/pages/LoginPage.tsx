import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/auth-store';
import type { AuthUser } from '../store/auth-store';

declare global { interface Window { __env__?: { API_URL?: string; POSTGREST_URL?: string } } }
const API_URL = window.__env__?.API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      const user = data.user as AuthUser;
      login(data.token, user);
      navigate(user.is_platform_admin ? '/admin' : '/');
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">AIOS</h1>
          <p className="text-surface-500 mt-1 text-sm">Sign in to your workspace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            error={error}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
