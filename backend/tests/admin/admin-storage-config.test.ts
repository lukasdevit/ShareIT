import { describe, it, expect } from 'vitest';
import { request, adminToken } from '../setup/setup.js';

describe('GET /admin/storage', () => {
  it('returns storage configuration', async () => {
    const res = await request
      .get('/admin/storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('backend');
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('total_files');
    expect(res.body).toHaveProperty('total_bytes');
    expect(res.body).toHaveProperty('registrations_open');
  });
});

describe('PATCH /admin/storage', () => {
  it('updates storage settings', async () => {
    const res = await request
      .patch('/admin/storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrations_open: 'false' })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.updated).toContain('registrations_open');
  });

  it('rejects empty update', async () => {
    await request
      .patch('/admin/storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });
});

describe('GET /admin/analytics', () => {
  it('returns analytics data', async () => {
    const res = await request
      .get('/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('total_files');
    expect(res.body).toHaveProperty('total_bytes');
    expect(res.body).toHaveProperty('uploads_today');
  });
});

describe('GET /admin/ssl', () => {
  it('returns SSL status', async () => {
    const res = await request
      .get('/admin/ssl')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('domain');
    expect(res.body).toHaveProperty('is_local');
    expect(res.body).toHaveProperty('managed_by');
  });
});
