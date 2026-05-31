'use client';

import { ProtectedPage } from '@/features/auth/ProtectedPage';
import { SettingsContent } from '@/features/settings/SettingsContent';

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SettingsContent />
    </ProtectedPage>
  );
}
