import { describe, it, expect } from 'vitest';
import { request, adminToken, userToken, userId } from '../setup/setup.js';

describe('POST /admin/storage/integrity (run check)', () => {
  it('runs an integrity check and returns summary', async () => {
    const res = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    expect(res.body).toHaveProperty('checkId');
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('missingFiles');
    expect(res.body.summary).toHaveProperty('orphanedFiles');
    expect(res.body.summary).toHaveProperty('sizeMismatches');
  });

  it('scopes check by userId', async () => {
    const res = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId })
      .expect(200);
    expect(res.body).toHaveProperty('checkId');
  });

  it('scopes check by username', async () => {
    const res = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'regular-user' })
      .expect(200);
    expect(res.body).toHaveProperty('checkId');
  });

  it('rejects non-admin (400 or 403)', async () => {
    const res = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${userToken}`);
    expect([400, 403]).toContain(res.status);
  });
});

describe('GET /admin/storage/integrity (list saved checks)', () => {
  it('returns list of saved checks', async () => {
    const res = await request
      .get('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('checks');
    expect(Array.isArray(res.body.checks)).toBe(true);
  });
});

describe('GET /admin/storage/integrity/:checkId (paginated issues)', () => {
  it('returns paginated issues with filters', async () => {
    // Run a check first
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const checkId = r.body.checkId;

    const res = await request
      .get(`/admin/storage/integrity/${checkId}?offset=0&limit=10`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('issues');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('unresolved');
  });

  it('filters by type', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const checkId = r.body.checkId;

    const res = await request
      .get(`/admin/storage/integrity/${checkId}?type=missing-file`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('issues');
  });

  it('returns 404 for invalid checkId', async () => {
    await request
      .get('/admin/storage/integrity/nonexistent-123')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});

describe('POST /admin/storage/integrity/:checkId/resolve (single & bulk)', () => {
  it('resolves a single issue with skip action', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const issues = await request
      .get(`/admin/storage/integrity/${r.body.checkId}?limit=1`)
      .set('Authorization', `Bearer ${adminToken}`);
    const issue = issues.body.issues?.[0];
    if (!issue) return;

    const res = await request
      .post(`/admin/storage/integrity/${r.body.checkId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ issueId: issue.id, action: 'skip' })
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid action', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    await request
      .post(`/admin/storage/integrity/${r.body.checkId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ issueId: 99999, action: 'invalid-action' })
      .expect(400);
  });

  it('resolves multiple issues in bulk', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const issues = await request
      .get(`/admin/storage/integrity/${r.body.checkId}?limit=5`)
      .set('Authorization', `Bearer ${adminToken}`);
    const ids = (issues.body.issues || [])
      .filter((i: any) => !i.resolved)
      .map((i: any) => i.id);
    if (ids.length === 0) return;

    const res = await request
      .post(`/admin/storage/integrity/${r.body.checkId}/resolve-bulk`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ issueIds: ids, action: 'skip' })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.resolved).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /admin/storage/integrity/:checkId/import', () => {
  it('imports orphaned files (empty set is ok)', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const res = await request
      .post(`/admin/storage/integrity/${r.body.checkId}/import`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ issueIds: [] })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.imported).toHaveLength(0);
  });
});

describe('DELETE /admin/storage/integrity/:checkId', () => {
  it('deletes a saved check', async () => {
    const r = await request
      .post('/admin/storage/integrity')
      .set('Authorization', `Bearer ${adminToken}`);
    const res = await request
      .delete(`/admin/storage/integrity/${r.body.checkId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /admin/storage/migrate', () => {
  it('rejects invalid paths gracefully', async () => {
    const res = await request
      .post('/admin/storage/migrate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paths: ['share/999/nonexistent.txt'], toUserId: 1 })
      .expect(200);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects missing toUserId', async () => {
    await request
      .post('/admin/storage/migrate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paths: ['share/1/test.txt'] })
      .expect(400);
  });
});

describe('GET /admin/file-preview', () => {
  it('returns 400 when path is missing', async () => {
    await request
      .get('/admin/file-preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('returns 404 for non-existent file', async () => {
    await request
      .get('/admin/file-preview?path=nonexistent/file.txt')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
