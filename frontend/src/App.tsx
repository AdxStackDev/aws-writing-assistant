import { useEffect, useState } from "react";

import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";
import Chat from "./components/Chat";
import Account from "./components/Account";

import {
  getCurrentUser,
  logout,
} from "./auth";

type Screen =
  | "login"
  | "register"
  | "verify"
  | "chat"
  | "account";


export default function App() {

  const [
    screen,
    setScreen
  ] = useState<Screen>("login");

  const [
    verificationEmail,
    setVerificationEmail
  ] = useState("");

  const [
    conversationId,
    setConversationId
  ] = useState<string | null>(
    null
  );


  useEffect(() => {

    if (getCurrentUser()) {
      setScreen("chat");
    }

  }, []);


  if (screen === "login") {

    return (
      <Login
        onLogin={() =>
          setScreen("chat")
        }
        onRegister={() =>
          setScreen("register")
        }
      />
    );
  }


  if (screen === "register") {

    return (
      <Register
        onRegistered={(email) => {

          setVerificationEmail(
            email
          );

          setScreen("verify");

        }}
        onLogin={() =>
          setScreen("login")
        }
      />
    );
  }


  if (screen === "verify") {

    return (
      <VerifyEmail
        email={
          verificationEmail
        }
        onVerified={() =>
          setScreen("login")
        }
      />
    );
  }


  return (
    <div className="app">

      <aside>

        <h2>
          Writing Assistant
        </h2>

        <button
          onClick={() => {
            setConversationId(null);
            setScreen("chat");
          }}
        >
          New Chat
        </button>

        <button
          onClick={() =>
            setScreen("account")
          }
        >
          Account
        </button>

        <button
          onClick={() => {

            logout();

            setScreen("login");

          }}
        >
          Logout
        </button>

      </aside>


      <main>

        {screen === "chat" && (
          <Chat
            conversationId={
              conversationId
            }
            onConversationCreated={
              setConversationId
            }
          />
        )}

        {screen === "account" && (
          <Account />
        )}

      </main>

    </div>
  );
}
