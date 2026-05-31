import { initSchema } from '../db/index.js';
import { vi } from 'vitest';

vi.mock('../services/cleanup/cleanup-jobs.js', () => ({
  startCleanupJobs: vi.fn(),
}));
vi.mock('../services/storage/backup-rotation.js', () => ({
  rotateBackups: vi.fn(),
}));
vi.mock('../utils/scan.js', () => ({ initScanner: vi.fn() }));

await initSchema();
