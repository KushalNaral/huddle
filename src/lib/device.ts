const KEY = "huddle_device";
let memory: string | null = null;

function newToken(): string {
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(24))) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * This device's secret. It's how the API knows you're you without an account;
 * only its hash is ever stored. Falls back to memory when storage is blocked,
 * which means a private window forgets you on reload.
 */
export function deviceToken(): string {
  if (memory !== null) return memory;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved !== null && /^[\w-]{20,64}$/.test(saved)) return (memory = saved);
  } catch {
    // storage blocked
  }
  memory = newToken();
  try {
    window.localStorage.setItem(KEY, memory);
  } catch {
    // storage blocked: keep it in memory
  }
  return memory;
}
