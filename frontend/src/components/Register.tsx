import { useState } from "react";
import { register } from "../auth";

interface Props {
  onRegistered: (email: string) => void;
  onLogin: () => void;
}

export default function Register({ onRegistered, onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      onRegistered(email);
    } catch (err: any) {
      setError(err.message || "Registration failed");
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

        <h1>Create account</h1>
        <p>Start improving your writing today</p>

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
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <div className="error">⚠ {error}</div>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div className="auth-divider"><span>or</span></div>

        <button type="button" className="auth-secondary" onClick={onLogin}>
          Back to sign in
        </button>

      </form>
    </div>
  );
}
