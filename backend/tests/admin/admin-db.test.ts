import { describe, it, expect } from 'vitest';
import { request, adminToken, userId } from '../setup/setup.js';

describe('GET /admin/db/tables', () => {
  it('returns table list with schemas', async () => {
    const res = await request
      .get('/admin/db/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('files');
    expect(names).toContain('integrity_checks');
    expect(names).toContain('integrity_issues');
    expect(names).toContain('admin_actions');
  });
});

describe('GET /admin/db/tables/:name/rows', () => {
  it('browses rows for a valid table', async () => {
    const res = await request
      .get('/admin/db/tables/users/rows')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.columns).toContain('username');
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.rowCount).toBeGreaterThanOrEqual(2);
  });

  it('rejects invalid table name', async () => {
    await request
      .get('/admin/db/tables/sqlite_master/rows')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});

describe('DELETE /admin/db/tables/:name/rows', () => {
  it('deletes a row by primary key', async () => {
    const createRes = await request
      .post('/auth/register')
      .send({ username: 'todelete2', password: 'delete123' });
    const dispId = createRes.body.user?.id;

    const res = await request
      .delete('/admin/db/tables/users/rows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pkColumn: 'id', pkValue: dispId })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.changes).toBeGreaterThanOrEqual(1);
  });

  it('rejects missing pkColumn/pkValue', async () => {
    await request
      .delete('/admin/db/tables/users/rows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('rejects invalid table name', async () => {
    await request
      .delete('/admin/db/tables/sqlite_master/rows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pkColumn: 'id', pkValue: 1 })
      .expect(400);
  });
});
