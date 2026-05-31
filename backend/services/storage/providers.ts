import type { StorageProvider } from './types.js';

type Factory = () => StorageProvider;

interface ProviderEntry {
  factory: Factory;
  settingKeys: readonly string[];
  label: string;
}

const _providers = new Map<string, ProviderEntry>();

/** Register a storage provider. Call once per provider at module level. */
export function registerProvider(
  name: string,
  factory: Factory,
  settingKeys: readonly string[],
  label: string,
): void {
  _providers.set(name, { factory, settingKeys, label });
}

/** All registered provider names. */
export function providerNames(): string[] {
  return [..._providers.keys()];
}

/** All registered providers with their labels (for admin UI dropdown). */
export function allProviders(): ReadonlyMap<string, { label: string; settingKeys: readonly string[] }> {
  return _providers;
}

/** Resolve a fresh StorageProvider by name. */
export function resolveProvider(backend: string): StorageProvider {
  const entry = _providers.get(backend);
  if (!entry) throw new Error(`Unknown storage backend: ${backend}`);
  return entry.factory();
}

/** All admin-configurable setting keys across all registered providers. */
export function allSettingKeys(): readonly string[] {
  const keys: string[] = [];
  for (const [, entry] of _providers) {
    keys.push(...entry.settingKeys);
  }
  return keys;
}
