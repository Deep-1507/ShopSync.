export const TOKEN_KEY = "shopsync_user_token";
export const USER_KEY = "shopsync_user";
export const USER_ID = "User_id";

export function getUserSession() {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      user: JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      ),
    };
  } catch {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      user: null,
    };
  }
}

export async function userRequest(url, options = {}) {
  const { token } = getUserSession();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed");
  }

  return result;
}