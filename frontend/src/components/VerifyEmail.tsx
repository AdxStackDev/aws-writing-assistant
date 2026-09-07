import { useState } from "react";
import { confirmRegistration } from "../auth";

interface Props {
  email: string;
  onVerified: () => void;
}

export default function VerifyEmail({ email, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmRegistration(email, code);
      onVerified();
    } catch (err: any) {
      setError(err.message || "Verification failed");
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

        <h1>Check your email</h1>
        <p>We sent a verification code to <strong style={{color:"#e8e8e8"}}>{email}</strong></p>

        <div className="input-group">
          <label className="input-label">Verification code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
            autoFocus
          />
        </div>

        {error && <div className="error">⚠ {error}</div>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify account"}
        </button>

      </form>
    </div>
  );
}
