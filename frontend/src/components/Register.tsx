import { useState } from "react";
import { register } from "../auth";

interface Props {
  onRegistered: (email: string) => void;
  onLogin: () => void;
}

export default function Register({
  onRegistered,
  onLogin,
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

      await register(
        email,
        password
      );

      onRegistered(email);

    } catch (error: any) {

      setError(
        error.message ||
        "Registration failed"
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

        <h1>Create account</h1>

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
            ? "Creating..."
            : "Create account"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onLogin}
        >
          Back to login
        </button>

      </form>

    </div>
  );
}
