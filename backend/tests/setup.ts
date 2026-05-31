import { initSchema } from '../db/index.js';
import { vi } from 'vitest';

vi.mock('../services/cleanup/cleanupJobs.js', () => ({
  startCleanupJobs: vi.fn(),
}));
vi.mock('../services/storage/backupRotation.js', () => ({
  rotateBackups: vi.fn(),
}));
vi.mock('../utils/scan.js', () => ({ initScanner: vi.fn() }));

await initSchema();
