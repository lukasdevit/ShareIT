import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileActions } from '@/hooks/use-file-actions';

function mockApi(response: Partial<Response> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
    ...response,
  } as Response);
}

describe('useFileActions', () => {
  let api: ReturnType<typeof mockApi>;

  beforeEach(() => {
    api = mockApi();
  });

  describe('copyLink', () => {
    it('copies a URL to clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      const { result } = renderHook(() => useFileActions(api));

      act(() => {
        result.current.copyLink('photo.png', 1);
      });

      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('/file/photo.png')
      );
      expect(result.current.copiedId).toBe(1);
    });

    it('clears copiedId after 2 seconds', async () => {
      vi.useFakeTimers();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      const { result } = renderHook(() => useFileActions(api));

      act(() => {
        result.current.copyLink('doc.pdf', 42);
      });
      expect(result.current.copiedId).toBe(42);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.copiedId).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('togglePublic', () => {
    it('calls PATCH and then onSuccess', async () => {
      const { result } = renderHook(() => useFileActions(api));
      const onSuccess = vi.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.togglePublic(1, true, onSuccess);
      });

      expect(api).toHaveBeenCalledWith('/file/1', expect.objectContaining({
        method: 'PATCH',
      }));
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  describe('deleteFile', () => {
    it('first click sets confirming state without deleting', async () => {
      const { result } = renderHook(() => useFileActions(api));
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.deleteFile(1, onSuccess);
      });

      expect(api).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.deletingId).toBe(1);
    });

    it('second click triggers delete and onSuccess', async () => {
      const { result } = renderHook(() => useFileActions(api));
      const onSuccess = vi.fn().mockResolvedValue(undefined);

      // First click — confirm
      await act(async () => {
        await result.current.deleteFile(1, onSuccess);
      });
      expect(result.current.deletingId).toBe(1);

      // Second click — actually delete
      await act(async () => {
        await result.current.deleteFile(1, onSuccess);
      });

      expect(api).toHaveBeenCalledWith('/file/1', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(result.current.deletingId).toBeNull();
    });

    it('clicking a different file resets confirming target', async () => {
      const { result } = renderHook(() => useFileActions(api));

      await act(async () => {
        await result.current.deleteFile(1, vi.fn());
      });
      expect(result.current.deletingId).toBe(1);

      await act(async () => {
        await result.current.deleteFile(2, vi.fn());
      });
      expect(result.current.deletingId).toBe(2);
    });
  });
});
