const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
const USE_CREDENTIALS = process.env.NEXT_PUBLIC_API_USE_CREDENTIALS === "true";
export const PASSWORD_CHANGE_REQUIRED_MESSAGE = "Password change required before accessing the system";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type StoredUser = {
  id?: number | string;
  email?: string;
  role?: string;
  requested_role?: string;
  token?: string;
};

export function buildApiUrl(path: string) {
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

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("stockmate_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function resolveEffectiveRole(user: StoredUser | null) {
  const role = String(user?.role || "").toLowerCase();
  const requestedRole = String(user?.requested_role || "").toLowerCase();

  if (role === "admin" || role === "cook" || role === "staff") return role;
  if (requestedRole === "admin" || requestedRole === "cook" || requestedRole === "staff") return requestedRole;
  return role || requestedRole;
}

function getAuthHeaders(method: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const user = getStoredUser();
  if (!user) return headers;

  const effectiveRole = resolveEffectiveRole(user);
  const sessionMarker = [user.id, user.email, effectiveRole].filter(Boolean).join(":");
  const normalizedMethod = method.toUpperCase();
  const isMutation = normalizedMethod !== "GET" && normalizedMethod !== "HEAD";

  // Avoid extra custom headers on cross-origin requests; they can trigger CORS
  // preflights the current Go backend does not answer for.
  if (user.token) {
    headers.Authorization = `Bearer ${user.token}`;
  } else if (isMutation && sessionMarker) {
    headers.Authorization = `Bearer session:${sessionMarker}`;
  }

  return headers;
}

export function isPasswordChangeRequiredErrorMessage(message: string) {
  return message.toLowerCase().includes("password change required");
}

function hasAccessDeniedMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("admin access is required") ||
    normalized.includes("you do not have permission to perform this action") ||
    normalized.includes("forbidden")
  );
}

export function isAccessDeniedError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 403 || hasAccessDeniedMessage(error.message);
  }

  if (error instanceof Error) {
    return hasAccessDeniedMessage(error.message);
  }

  return false;
}

function mergeHeaders(method: string, defaults?: HeadersInit, provided?: HeadersInit): HeadersInit {
  const headers = new Headers(defaults);

  const authHeaders = getAuthHeaders(method);
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  if (provided) {
    const extra = new Headers(provided);
    extra.forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function createRequestInit(method: string, init?: RequestInit, body?: unknown): RequestInit {
  const hasJsonBody = body !== undefined;

  return {
    ...init,
    method,
    credentials: resolveCredentials(init?.credentials),
    headers: mergeHeaders(
      method,
      hasJsonBody ? { "Content-Type": "application/json" } : undefined,
      init?.headers
    ),
    body: hasJsonBody ? JSON.stringify(body) : init?.body,
  };
}

export function createApiRequestInit(method: string, init?: RequestInit, body?: unknown): RequestInit {
  return createRequestInit(method, init, body);
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

    throw new ApiError(errorMessage, response.status);
  }
  
  return response;
}

export const ApiClient = {
  get: (path: string, init?: RequestInit) =>
    fetch(buildApiUrl(path), createRequestInit("GET", init))
      .then(handleResponse),

  post: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildApiUrl(path), createRequestInit("POST", init, body))
      .then(handleResponse),

  put: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildApiUrl(path), createRequestInit("PUT", init, body))
      .then(handleResponse),

  patch: (path: string, body?: unknown, init?: RequestInit) =>
    fetch(buildApiUrl(path), createRequestInit("PATCH", init, body))
      .then(handleResponse),

  delete: (path: string, init?: RequestInit) =>
    fetch(buildApiUrl(path), createRequestInit("DELETE", init))
      .then(handleResponse),
};
