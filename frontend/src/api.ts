import { getAccessToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL;


async function request(
  path: string,
  options: RequestInit = {}
) {

  const token = await getAccessToken();

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {

    const error =
      await response.json()
        .catch(() => ({}));

    throw new Error(
      error.error ||
      "Request failed"
    );
  }

  return response.json();
}


export function sendChat(
  message: string,
  conversationId?: string
) {

  return request(
    "/chat",
    {
      method: "POST",

      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    }
  );
}


export function getConversations() {
  return request(
    "/conversations"
  );
}


export function getConversation(
  conversationId: string
) {

  return request(
    `/conversations/${conversationId}`
  );
}


export function getProfile() {
  return request(
    "/profile"
  );
}


export function updateProfile(
  displayName: string
) {

  return request(
    "/profile",
    {
      method: "PUT",

      body: JSON.stringify({
        display_name: displayName,
      }),
    }
  );
}