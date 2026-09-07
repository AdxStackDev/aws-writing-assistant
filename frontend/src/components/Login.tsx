import { useState } from "react";
import { login } from "../auth";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function Login({ onLogin, onRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>

        <div className="auth-brand">
          <div className="auth-brand-icon">✦</div>
          <span className="auth-brand-name">Writing Assistant</span>
        </div>

        <h1>Welcome back</h1>
        <p>Sign in to your account to continue</p>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error">⚠ {error}</div>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="auth-divider"><span>or</span></div>

        <button type="button" className="auth-secondary" onClick={onRegister}>
          Create a new account
        </button>

      </form>
    </div>
  );
}
