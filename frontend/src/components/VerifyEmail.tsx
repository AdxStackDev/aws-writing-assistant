import { useState } from "react";
import { confirmRegistration } from "../auth";

interface Props {
  email: string;
  onVerified: () => void;
}

export default function VerifyEmail({
  email,
  onVerified,
}: Props) {

  const [code, setCode] =
    useState("");

  const [error, setError] =
    useState("");


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    try {

      await confirmRegistration(
        email,
        code
      );

      onVerified();

    } catch (error: any) {

      setError(
        error.message ||
        "Verification failed"
      );
    }
  }


  return (
    <div className="auth-page">

      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >

        <h1>Verify email</h1>

        <p>
          Enter the verification code
          sent to {email}.
        </p>

        <input
          value={code}
          onChange={(e) =>
            setCode(e.target.value)
          }
          placeholder="Verification code"
          required
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button type="submit">
          Verify account
        </button>

      </form>

    </div>
  );
}