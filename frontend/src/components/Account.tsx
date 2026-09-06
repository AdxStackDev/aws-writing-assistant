import {
  useEffect,
  useState,
} from "react";

import {
  getProfile,
  updateProfile,
} from "../api";

export default function Account() {

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");


  useEffect(() => {

    getProfile()
      .then((profile) => {

        setDisplayName(
          profile.display_name || ""
        );

        setEmail(
          profile.email || ""
        );

      })
      .catch(console.error);

  }, []);


  async function save() {

    await updateProfile(
      displayName
    );

    setMessage(
      "Profile updated"
    );
  }


  return (
    <div className="account">

      <h2>My Account</h2>

      <label>
        Email
      </label>

      <input
        value={email}
        disabled
      />

      <label>
        Display name
      </label>

      <input
        value={displayName}
        onChange={(e) =>
          setDisplayName(
            e.target.value
          )
        }
      />

      <button onClick={save}>
        Save
      </button>

      {message && (
        <p>{message}</p>
      )}

    </div>
  );
}