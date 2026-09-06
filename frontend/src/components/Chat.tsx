import { useEffect, useRef, useState } from "react";
import { getConversation, sendChat } from "../api";

interface Message {
  role: string;
  content: string;
  created_at?: string;
}

interface Props {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export default function Chat({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    getConversation(conversationId)
      .then((data) => setMessages(data.messages || []))
      .catch(console.error);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const result = await sendChat(text, conversationId || undefined);
      if (!conversationId) {
        onConversationCreated(result.conversation_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: err.message || "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <h2>Writing Assistant</h2>
            <p>Paste your writing and ask for feedback, improvements, or analysis.</p>
            <div className="suggestions">
              <span className="suggestion">Review my paragraph</span>
              <span className="suggestion">Check readability</span>
              <span className="suggestion">Find weak words</span>
              <span className="suggestion">Improve tone</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "user" ? "U" : "✦"}
            </div>
            <div className="message-bubble">
              <div className="message-role">
                {msg.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar">✦</div>
            <div className="message-bubble">
              <div className="message-role">Assistant</div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            className="input-box"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the writing assistant... (Enter to send, Shift+Enter for new line)"
            rows={3}
            maxLength={8000}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "↑"}
          </button>
        </form>
        <p className="input-hint">{input.length}/8000</p>
      </div>
    </div>
  );
}
