import { useState } from "react";
import { login } from "../auth";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function Login({
  onLogin,
  onRegister,
}: Props) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    setError("");
    setLoading(true);

    try {

      await login(
        email,
        password
      );

      onLogin();

    } catch (error: any) {

      setError(
        error.message ||
        "Login failed"
      );

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="auth-page">

      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >

        <h1>Writing Assistant</h1>

        <p>
          Sign in to continue
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onRegister}
        >
          Create account
        </button>

      </form>

    </div>
  );
}