import { AuthGuard } from '@/features/auth/AuthGuard';
import { AdminContent } from './AdminContent';

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}
