import { B2_ENABLED, B2_PREFIX } from "../../config/index.js";
import { LocalStorage } from "./local.js";
import { B2Storage } from "./b2.js";
import type { StorageProvider } from "./types.js";

export type { StorageProvider } from "./types.js";

// ── Singleton ──

let _storage: StorageProvider;

export function getStorage(): StorageProvider {
  if (!_storage) {
    _storage = B2_ENABLED ? new B2Storage() : new LocalStorage();
    console.warn(`Storage: ${B2_ENABLED ? "Backblaze B2" : "local filesystem"}`);
  }
  return _storage;
}

// ── Helper ──

export function buildStorageKey(userId: number, filename: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const base = `share/${userId}/${yyyy}/${mm}/${dd}/${filename}`;
  return B2_ENABLED && B2_PREFIX ? `${B2_PREFIX.replace(/\/$/, "")}/${base}` : base;
}
