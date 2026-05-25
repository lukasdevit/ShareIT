"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
import { SettingsPage } from "../../components/SettingsPage";

export default function SettingsRoute() {
  const { user, token, api } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!user) router.replace("/"); }, [user]);

  if (!user || !token) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SettingsPage token={token} user={user} apiFetch={api} onBack={() => router.push("/files")} />
    </div>
  );
}
