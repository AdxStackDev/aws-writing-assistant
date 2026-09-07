import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api";

export default function Account() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setDisplayName(profile.display_name || "");
        setEmail(profile.email || "");
      })
      .catch(console.error);
  }, []);

  async function save() {
    setLoading(true);
    try {
      await updateProfile(displayName);
      setMessage("Profile updated successfully");
    } catch {
      setMessage("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account">
      <div className="account-header">
        <h2>Account settings</h2>
        <p>Manage your profile information</p>
      </div>

      <div className="account-card">
        <label>Email</label>
        <input value={email} disabled />

        <label>Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />

        <button className="account-save-btn" onClick={save} disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </button>

        {message && (
          <div className="account-success">✓ {message}</div>
        )}
      </div>
    </div>
  );
}
