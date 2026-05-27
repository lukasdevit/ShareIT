"use client";

import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useAuth } from "../../lib/api";
import { ToastProvider } from "../../components/Toast";
import { SettingsPage } from "../../components/SettingsPage";

export default function SettingsRoute() {
  const { api } = useAuth();
  const { isReady } = useRequireAuth();

  if (!isReady) return null;

  return (
    <ToastProvider>
      <div className="max-w-2xl mx-auto p-6 lg:p-8">
        <SettingsPage apiFetch={api} onBack={() => {}} />
      </div>
    </ToastProvider>
  );
}
