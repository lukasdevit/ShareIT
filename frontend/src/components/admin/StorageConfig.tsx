'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { CardSkeleton } from '@/components/ui/CardSkeleton';

interface Props {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

interface StorageData {
  backend: string;
  default_storage_limit: number;
  total_storage_limit: number;
  b2_endpoint?: string;
  b2_region?: string;
  b2_bucket?: string;
  b2_prefix?: string;
  b2_key_id?: string;
  b2_has_key_id?: boolean;
  b2_has_app_key?: boolean;
  disk_total?: number;
  disk_used?: number;
  disk_free?: number;
  users: number;
  total_files: number;
  total_bytes: number;
  registrations_open: boolean;
  s3_upload_enabled: boolean;
}

const LABELS: Record<string, string> = {
  backend: 'Storage backend',
  total_storage_limit: 'Total storage limit',
  storage_path: 'Storage path',
  b2_endpoint: 'B2 endpoint',
  b2_region: 'B2 region',
  b2_bucket: 'B2 bucket',
  b2_prefix: 'B2 prefix',
  b2_key_id: 'B2 key ID',
  b2_app_key: 'B2 app key',
  registrations_open: 'Registrations open',
  s3_upload_enabled: 'S3 upload',
  backup_retention_days: 'Backup retention',
};

function fmtBytes(b: string): string {
  const n = parseInt(b, 10);
  if (!n) return b;
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

/** Build a readable summary of what was saved. */
function formatSavedMessage(updated: string[], form: Record<string, string>): string {
  const sensitive = ['b2_key_id', 'b2_app_key'];
  const items = updated.map((key) => {
    const label = LABELS[key] || key;
    if (sensitive.includes(key)) return `${label}: ••••••••`;
    let value = form[key] || '';
    if (key === 'total_storage_limit' && value) value = fmtBytes(value);
    if (key === 'backend' && value === 'b2') value = 'Backblaze B2';
    if (key === 'registrations_open' || key === 's3_upload_enabled') {
      value = value === 'true' ? 'on' : 'off';
    }
    return value ? `${label} → ${value}` : label;
  });
  return `Storage updated:\n${items.join('\n')}`;
}

export function StorageConfig({ apiFetch }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKeyId, setShowKeyId] = useState(false);
  const [showAppKey, setShowAppKey] = useState(false);

  const revealAppKey = useCallback(async () => {
    if (showAppKey) { setShowAppKey(false); return; }
    try {
      const r = await apiFetch('/admin/storage/secrets');
      const d = await r.json();
      if (d.b2_app_key) setForm((f) => ({ ...f, b2_app_key: d.b2_app_key }));
    } catch { /* */ }
    setShowAppKey(true);
  }, [showAppKey, apiFetch]);

  const revealKey = useCallback(async () => {
    if (showKeyId) { setShowKeyId(false); return; }
    try {
      const r = await apiFetch('/admin/storage/secrets');
      const d = await r.json();
      if (d.b2_key_id) setForm((f) => ({ ...f, b2_key_id: d.b2_key_id }));
    } catch { /* */ }
    setShowKeyId(true);
  }, [showKeyId, apiFetch]);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/admin/storage')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setForm((prev) => ({
          backend: d.backend || 'local',
          total_storage_limit: String(d.total_storage_limit ?? 0),
          b2_endpoint: d.b2_endpoint || '',
          b2_region: d.b2_region || '',
          b2_bucket: d.b2_bucket || '',
          b2_prefix: d.b2_prefix || '',
          b2_key_id: prev.b2_key_id || '',
          b2_app_key: prev.b2_app_key || '',
          s3_upload_enabled: String(d.s3_upload_enabled === true),
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch('/admin/storage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const savedMsg = formatSavedMessage(d.updated, form);
      toast(savedMsg, 'ok');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <section className="card">
        <CardSkeleton lines={4} />
      </section>
    );
  if (!data)
    return (
      <section className="card">
        <p className="text-sm text-red-400">Failed to load storage info.</p>
      </section>
    );

  return (
    <section className="card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="card-title">💾 Storage Configuration</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-400">✓ Saved</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-green text-xs"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
          <div>
            <label
              htmlFor="storage-backend"
              className="block text-xs text-zinc-500 mb-1"
            >
              Backend
            </label>
            <select
              id="storage-backend"
              value={form.backend}
              onChange={(e) => setForm({ ...form, backend: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="local">💻 Local filesystem</option>
              <option value="b2">☁️ Backblaze B2</option>
            </select>
          </div>
          {form.backend === 'b2' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['b2_endpoint', 'Endpoint'],
                ['b2_region', 'Region'],
                ['b2_bucket', 'Bucket'],
                ['b2_prefix', 'Prefix'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`b2-${key}`} className="block text-xs text-zinc-500 mb-1">{label}</label>
                  <input id={`b2-${key}`} type="text" value={form[key] || ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label htmlFor="b2-key_id" className="block text-xs text-zinc-500 mb-1">Key ID</label>
                <div className="relative">
                  <input id="b2-key_id" type={showKeyId ? 'text' : 'password'} value={form.b2_key_id || ''}
                    placeholder={data?.b2_has_key_id ? '••••••••' : ''}
                    onChange={(e) => setForm({ ...form, b2_key_id: e.target.value })}
                    className="w-full px-3 py-2 pr-10 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <VisibilityToggle isPublic={showKeyId} onClick={revealKey} />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="b2-app_key" className="block text-xs text-zinc-500 mb-1">Application Key</label>
                <div className="relative">
                  <input id="b2-app_key" type={showAppKey ? 'text' : 'password'} value={form.b2_app_key || ''}
                    placeholder={data?.b2_has_app_key ? '••••••••' : ''}
                    onChange={(e) => setForm({ ...form, b2_app_key: e.target.value })}
                    className="w-full px-3 py-2 pr-10 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <VisibilityToggle isPublic={showAppKey} onClick={revealAppKey} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="total-storage-limit" className="block text-xs text-zinc-500 mb-1">
              Total App Storage Limit (bytes, 0 = unlimited)
            </label>
            <input
              id="total-storage-limit"
              type="number"
              min="0"
              value={form.total_storage_limit || '0'}
              onChange={(e) => setForm({ ...form, total_storage_limit: e.target.value })}
              className="w-full sm:w-64 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-xs text-zinc-600 mt-1">
              0 = unlimited. Current usage shown in the metrics above.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div>
              <span className="text-sm font-medium text-zinc-200">
                S3 Multipart Upload
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Direct-to-storage chunked uploads (requires B2)
              </p>
            </div>
            <button
              type="button"
              aria-label={
                form.s3_upload_enabled === 'true'
                  ? 'Disable S3 upload'
                  : 'Enable S3 upload'
              }
              onClick={() =>
                setForm({
                  ...form,
                  s3_upload_enabled:
                    form.s3_upload_enabled === 'true' ? 'false' : 'true',
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.s3_upload_enabled === 'true' ? 'bg-green-600' : 'bg-zinc-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.s3_upload_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
    </section>
  );
}
