'use client';

import { ProtectedPage } from '@/features/auth/ProtectedPage';
import { FilesContent } from '@/features/files/FilesContent';

export default function FilesPage() {
  return (
    <ProtectedPage>
      <div className="min-h-0 flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        <FilesContent />
      </div>
    </ProtectedPage>
  );
}
