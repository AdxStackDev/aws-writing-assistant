import { useEffect, useRef, useState } from "react";

import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";
import Chat from "./components/Chat";
import Account from "./components/Account";

import { getCurrentUser, logout } from "./auth";
import { getConversations } from "./api";

interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

type Screen = "login" | "register" | "verify" | "chat" | "account";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getCurrentUser()) {
      setScreen("chat");
      loadConversations();
    }
  }, []);

  async function loadConversations() {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch {
      // no conversations yet
    }
  }

  function handleConversationCreated(id: string) {
    setConversationId(id);
    loadConversations();
  }

  function selectConversation(id: string) {
    setConversationId(id);
    if (screen !== "chat") setScreen("chat");
  }

  if (screen === "login") {
    return (
      <Login
        onLogin={() => { setScreen("chat"); loadConversations(); }}
        onRegister={() => setScreen("register")}
      />
    );
  }

  if (screen === "register") {
    return (
      <Register
        onRegistered={(email) => { setVerificationEmail(email); setScreen("verify"); }}
        onLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "verify") {
    return (
      <VerifyEmail
        email={verificationEmail}
        onVerified={() => setScreen("login")}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-box">✦</div>
          <span className="sidebar-title">Writing Assistant</span>
        </div>

        <button
          className="new-chat-btn"
          onClick={() => { setConversationId(null); setScreen("chat"); }}
        >
          <div className="new-chat-plus">+</div>
          New Chat
        </button>

        <nav className="sidebar-nav">
          {conversations.length > 0 && (
            <>
              <p className="nav-section-label">Recent</p>
              {conversations.map((conv) => (
                <button
                  key={conv.conversation_id}
                  className={`nav-item${conv.conversation_id === conversationId ? " active" : ""}`}
                  onClick={() => selectConversation(conv.conversation_id)}
                  title={conv.title || "Untitled"}
                >
                  <span className="nav-item-dot"></span>
                  <span className="nav-item-text">{conv.title || "Untitled"}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`footer-btn${screen === "account" ? " active" : ""}`}
            onClick={() => setScreen("account")}
          >
            <span className="footer-icon">⚙</span> Account
          </button>
          <button
            className="footer-btn"
            onClick={() => { logout(); setScreen("login"); setConversationId(null); setConversations([]); }}
          >
            <span className="footer-icon">↩</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content" ref={mainRef}>
        {screen === "chat" && (
          <Chat
            conversationId={conversationId}
            onConversationCreated={handleConversationCreated}
          />
        )}
        {screen === "account" && <Account />}
      </main>
    </div>
  );
}
