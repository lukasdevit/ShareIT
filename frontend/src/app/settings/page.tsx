"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { SettingsPage } from "../../components/SettingsPage";

export default function SettingsRoute() {
  const { api } = useAuth();
  const { isReady } = useRequireAuth();
  const router = useRouter();

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SettingsPage apiFetch={api} onBack={() => router.push("/files")} />
    </div>
  );
}
