import { AuthGuard } from '@/features/auth/AuthGuard';
import { FilesContent } from './FilesContent';

export default function FilesPage() {
  return (
    <AuthGuard>
      <FilesContent />
    </AuthGuard>
  );
}
