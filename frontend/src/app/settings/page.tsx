import { AuthGuard } from '@/features/auth/AuthGuard';
import { SettingsContent } from './SettingsContent';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
