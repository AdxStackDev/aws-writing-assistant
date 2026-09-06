import { useEffect, useState } from "react";
import {
  getConversation,
  sendChat,
} from "../api";

interface Message {
  role: string;
  content: string;
  created_at?: string;
}

interface Props {
  conversationId: string | null;
  onConversationCreated: (
    id: string
  ) => void;
}

export default function Chat({
  conversationId,
  onConversationCreated,
}: Props) {

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  useEffect(() => {

    if (!conversationId) {
      setMessages([]);
      return;
    }

    getConversation(
      conversationId
    )
      .then((data) => {
        setMessages(
          data.messages || []
        );
      })
      .catch(console.error);

  }, [conversationId]);


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setInput("");
    setLoading(true);

    setMessages((current) => [
      ...current,

      {
        role: "user",
        content: text,
      },
    ]);

    try {

      const result =
        await sendChat(
          text,
          conversationId ||
          undefined
        );

      if (!conversationId) {

        onConversationCreated(
          result.conversation_id
        );
      }

      setMessages((current) => [
        ...current,

        {
          role: "assistant",
          content: result.message,
        },
      ]);

    } catch (error: any) {

      setMessages((current) => [
        ...current,

        {
          role: "assistant",
          content:
            error.message ||
            "Something went wrong.",
        },
      ]);

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="chat">

      <div className="messages">

        {messages.length === 0 && (
          <div className="empty-chat">
            <h2>
              Writing Assistant
            </h2>

            <p>
              Paste your writing and ask
              for feedback.
            </p>
          </div>
        )}

        {messages.map(
          (message, index) => (
            <div
              key={index}
              className={
                `message ${message.role}`
              }
            >
              <div>
                {message.content}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="message assistant">
            Thinking...
          </div>
        )}

      </div>


      <form
        className="chat-input"
        onSubmit={handleSubmit}
      >

        <textarea
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          placeholder="Ask the writing assistant..."
          rows={4}
        />

        <button
          type="submit"
          disabled={loading}
        >
          Send
        </button>

      </form>

    </div>
  );
}
