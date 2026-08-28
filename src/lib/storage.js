/**
 * Persistence adapter.
 *
 * The app talks to this, not to a specific store, so swapping localStorage for
 * a real backend later is a one-file change rather than a hunt through the UI.
 */
const memory = new Map();

const backend =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : null;

export const storage = {
  async get(key) {
    if (!backend) return memory.has(key) ? { key, value: memory.get(key) } : null;
    const value = backend.getItem(key);
    return value === null ? null : { key, value };
  },

  async set(key, value) {
    if (!backend) { memory.set(key, value); return { key, value }; }
    backend.setItem(key, value);
    return { key, value };
  },

  async remove(key) {
    if (!backend) { memory.delete(key); return; }
    backend.removeItem(key);
  },
};
