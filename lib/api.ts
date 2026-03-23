const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");

function buildUrl(path: string) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${BASE_URL}${path}`;
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
        } else if (parsed.id && parsed.email) {
          headers.Authorization = "Bearer local-session";
        }
      } catch (e) {
        // Failed to parse user, silence error
      }
    }
  }
  
  return headers;
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
    } catch (e) {
      // Could not parse error response, use status code
    }
    throw new Error(errorMessage);
  }
  
  return response;
}

export const ApiClient = {
  get: (path: string, init?: RequestInit) =>
    fetch(buildUrl(path), { method: "GET", ...init, headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers) })
      .then(handleResponse),

  post: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "POST",
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  put: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "PUT",
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  patch: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildUrl(path), {
      method: "PATCH",
      headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    })
      .then(handleResponse),

  delete: (path: string, init?: RequestInit) =>
    fetch(buildUrl(path), { method: "DELETE", ...init, headers: mergeHeaders({ "Content-Type": "application/json" }, init?.headers) })
      .then(handleResponse),
};
