'use client';

import { useEffect } from 'react';
import { API_BASE } from '@/lib/api-client';

/**
 * Captures unhandled browser errors and reports them to the server log.
 * Renders nothing — just side effects.
 */
export function ErrorReporter() {
  useEffect(() => {
    function report(message: string, stack?: string) {
      fetch(`${API_BASE}/admin/logs/frontend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          stack,
          url: window.location.href,
        }),
      }).catch(() => { /* can't log if server is down */ });
    }

    // Uncaught errors
    function onError(event: ErrorEvent) {
      report(event.message || 'Unknown error', event.error?.stack);
    }

    // Unhandled promise rejections
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      report(msg, stack);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
