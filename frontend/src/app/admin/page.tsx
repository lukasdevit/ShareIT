'use client';

import { ProtectedPage } from '@/features/auth/ProtectedPage';
import { AdminContent } from '@/features/admin/AdminContent';

export default function AdminPage() {
  return (
    <ProtectedPage adminOnly>
      <AdminContent />
    </ProtectedPage>
  );
}
