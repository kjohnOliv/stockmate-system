const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
const USE_CREDENTIALS = process.env.NEXT_PUBLIC_API_USE_CREDENTIALS === "true";
export const PASSWORD_CHANGE_REQUIRED_MESSAGE = "Password change required before accessing the system";

function buildUrl(path: string) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${BASE_URL}${path}`;
}

function resolveCredentials(provided?: RequestCredentials): RequestCredentials | undefined {
  if (provided) return provided;
  if (typeof window === "undefined") return undefined;

  try {
    const target = new URL(BASE_URL);
    const current = new URL(window.location.origin);
    const isSameOrigin = target.origin === current.origin;

    if (isSameOrigin) return "same-origin";
    if (USE_CREDENTIALS) return "include";
    return "omit";
  } catch {
    return undefined;
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // The current Go backend only checks that an Authorization header exists.
  // If a real token is available we send it, otherwise we fall back to a
  // lightweight session marker while the backend auth layer is still minimal.
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("stockmate_user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.token) {
          headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch {
        // Failed to parse user, silence error
      }
    }
  }
  
  return headers;
}

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("stockmate_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { email?: string };
  } catch {
    return null;
  }
}

export function isPasswordChangeRequiredErrorMessage(message: string) {
  return message.toLowerCase().includes("password change required");
}

function mergeHeaders(defaults: HeadersInit, provided?: HeadersInit): HeadersInit {
  const headers = new Headers(defaults);
  
  // Add auth headers
  const authHeaders = getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  if (provided) {
    const extra = new Headers(provided);
    extra.forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

async function handleResponse(response: Response) {
  // Handle unauthorized
  if (response.status === 401) {
    // Clear stored user and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("stockmate_user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  
  // Handle server errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // Could not parse error response, use status code
    }

    if (isPasswordChangeRequiredErrorMessage(errorMessage) && typeof window !== "undefined") {
      const savedUser = getStoredUser();
      const emailParam = savedUser?.email ? `?email=${encodeURIComponent(savedUser.email)}&required=1` : "?required=1";
      localStorage.removeItem("stockmate_user");
      window.location.href = `/reset-password${emailParam}`;
    }

    throw new Error(errorMessage);
  }
  
  return response;
}

export const ApiClient = {
  get: (path: string, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "GET",
      credentials: resolveCredentials(init?.credentials),
      ...init,
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
    })
      .then(handleResponse),

  post: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "POST",
      credentials: resolveCredentials(init?.credentials),
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  put: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "PUT",
      credentials: resolveCredentials(init?.credentials),
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  patch: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "PATCH",
      credentials: resolveCredentials(init?.credentials),
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  delete: (path: string, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "DELETE",
      credentials: resolveCredentials(init?.credentials),
      ...init,
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
    })
      .then(handleResponse),
};
