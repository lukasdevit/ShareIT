'use client';

import { useState } from 'react';
import type { StorageInfo } from '@/types';

/**
 * Hook for password change and storage info fetching (settings page).
 */
export function useSettings(apiFetch: (path: string, options?: RequestInit) => Promise<Response>) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  async function fetchStorage() {
    setStorageLoading(true);
    try {
      const r = await apiFetch('/auth/storage');
      if (r.ok) setStorage(await r.json());
    } finally {
      setStorageLoading(false);
    }
  }

  async function changePassword(): Promise<string> {
    const r = await apiFetch('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setCurrentPassword('');
    setNewPassword('');
    return 'Password changed successfully';
  }

  return {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    storage, storageLoading,
    fetchStorage,
    changePassword,
  };
}
