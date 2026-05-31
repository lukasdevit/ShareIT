import { db } from './connection.js';

/** Promisified db.get */
export function dbGet<T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/** Promisified db.all */
export function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/** Promisified db.run */
export function dbRun(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastID: number }> {
  return new Promise((resolve, reject) => {
    db.run(
      sql,
      params,
      function (this: { changes: number; lastID: number }, err: Error | null) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      }
    );
  });
}
