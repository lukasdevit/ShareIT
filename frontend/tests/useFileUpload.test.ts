import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/use-file-upload';

type EventMap = Record<string, (e: unknown) => void>;

/**
 * Minimal XMLHttpRequest mock. Each instance stores its own event listeners
 * and fires the 'load' event asynchronously after send().
 */
function createXHRMock() {
  const listeners: EventMap = {};

  return {
    upload: {
      addEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
        listeners[`upload:${event}`] = cb;
      }),
    },
    status: 200,
    responseText: '{}',
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn().mockImplementation(() => {
      setTimeout(() => listeners['load']?.({ type: 'load' }));
    }),
    addEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
      listeners[event] = cb;
    }),
    // Expose for test assertions
    _fireUploadProgress(e: ProgressEvent) {
      listeners['upload:progress']?.(e);
    },
  };
}

type XHRMock = ReturnType<typeof createXHRMock>;

describe('useFileUpload', () => {
  let api: ReturnType<typeof vi.fn>;
  let xhrInstance: XHRMock | null = null;

  beforeEach(() => {
    api = vi.fn();
    xhrInstance = null;
    // Replace global XMLHttpRequest with a constructor that returns our mock
    globalThis.XMLHttpRequest = function (this: XHRMock | void) {
      const mock = createXHRMock();
      xhrInstance = mock;
      return mock;
    } as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    // Restore original — but only if we know it; jsdom provides a stubbed one
    vi.unstubAllGlobals?.();
  });

  it('uploads a file and calls onSuccess', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const onSuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useFileUpload(api, 'test-token'));

    await act(async () => {
      await result.current.uploadFile(file, onSuccess);
    });

    const xhr = xhrInstance!;
    expect(xhr.open).toHaveBeenCalledWith('POST', expect.stringContaining('/upload'));
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(result.current.uploading).toBe(false);
  });

  it('tracks upload progress', async () => {
    const file = new File(['x'.repeat(100)], 'big.bin');
    const onSuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useFileUpload(api, 'test-token'));

    await act(async () => {
      const uploadPromise = result.current.uploadFile(file, onSuccess);
      // Fire progress event while upload is in flight
      xhrInstance!._fireUploadProgress({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      } as ProgressEvent);
      await uploadPromise;
    });

    expect(result.current.uploadProgress).toBe(50);
  });

  it('sets dragOver via setDragOver', () => {
    const { result } = renderHook(() => useFileUpload(api, null));

    act(() => {
      result.current.setDragOver(true);
    });
    expect(result.current.dragOver).toBe(true);

    act(() => {
      result.current.setDragOver(false);
    });
    expect(result.current.dragOver).toBe(false);
  });
});
