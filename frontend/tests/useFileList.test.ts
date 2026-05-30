import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileList } from '@/hooks/useFileList';

function mockFilePage(overrides = {}) {
  return {
    files: [],
    total: 0,
    page: 1,
    totalPages: 0,
    ...overrides,
  };
}

describe('useFileList', () => {
  it('fetches files and images in parallel on mount', async () => {
    const fileRes = mockFilePage({
      files: [{ id: 1, filename: 'a.txt', original_name: 'a.txt', size: 100, mime_type: 'text/plain', created_at: '2026-01-01', is_public: 0 }],
      total: 1,
      totalPages: 1,
    });
    const imgRes = mockFilePage({
      files: [{ id: 2, filename: 'b.png', original_name: 'b.png', size: 200, mime_type: 'image/png', created_at: '2026-01-02', is_public: 0 }],
      total: 1,
      totalPages: 1,
    });
    const audioRes = mockFilePage({ total: 0 });
    const videoRes = mockFilePage({ total: 0 });

    const api = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => fileRes } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => imgRes } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => audioRes } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => videoRes } as Response);

    const { result } = renderHook(() => useFileList(api, { pageSize: 10 }));

    await act(async () => {
      await result.current.fetchFiles('all', 1, '');
    });

    expect(api).toHaveBeenCalledTimes(4);
    expect(result.current.files).toHaveLength(1);
    expect(result.current.imageFiles).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.imageTotal).toBe(1);
  });

  it('passes search term to requests', async () => {
    const api = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => mockFilePage() } as Response);

    const { result } = renderHook(() => useFileList(api));

    await act(async () => {
      await result.current.fetchFiles('all', 1, 'test-query');
    });

    const calls = api.mock.calls as string[][];
    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(calls[0][0]).toContain('search=test-query');
    expect(calls[1][0]).toContain('search=test-query');
  });

  it('uses custom pageSize in query params', async () => {
    const api = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => mockFilePage() } as Response);

    const { result } = renderHook(() => useFileList(api, { pageSize: 25 }));

    await act(async () => {
      await result.current.fetchFiles('files', 1);
    });

    const calls = api.mock.calls as string[][];
    expect(calls[0][0]).toContain('limit=25');
  });

  it('handles API errors gracefully', async () => {
    const api = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFileList(api));

    // Should not throw
    await act(async () => {
      await result.current.fetchFiles('all', 1, '');
    });

    expect(result.current.files).toEqual([]);
  });
});
