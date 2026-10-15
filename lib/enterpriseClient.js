export const TOKEN_KEY = "shopsync_enterprise_token";
export const ENTERPRISE_KEY = "shopsync_enterprise";
export const ENTERPRISE_ID = "Enterprise_id";

export function getEnterpriseSession() {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      enterprise: JSON.parse(
        localStorage.getItem(ENTERPRISE_KEY) || "null"
      ),
    };
  } catch {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      enterprise: null,
    };
  }
}

export async function enterpriseRequest(url, options = {}) {
    const { token: enterpriseToken } = getEnterpriseSession();

    const userToken = localStorage.getItem("shopsync_user_token");
    const token = enterpriseToken || userToken;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            ...options.headers,
        },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Request failed");
    }

    return result;
}