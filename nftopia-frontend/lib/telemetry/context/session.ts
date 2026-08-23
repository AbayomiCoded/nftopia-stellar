// Session resolver for telemetry context enrichment

const SESSION_KEY = "nftopia_session_id_v1";

function generateSessionId(): string {
  // Simple UUID-like fallback
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substr(2, 10)
  );
}

export function resolveSessionId(): string {
  if (typeof window === "undefined") return "unknown";
  try {
    if (window.sessionStorage) {
      let id = window.sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = generateSessionId();
        window.sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    }
  } catch {}
  // Fallback: in-memory (not persistent)
  if (!(window as any)._nftopiaSessionId) {
    (window as any)._nftopiaSessionId = generateSessionId();
  }
  return (window as any)._nftopiaSessionId;
}
