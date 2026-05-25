"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/api";
import { SettingsPage } from "../../components/SettingsPage";

export default function SettingsRoute() {
  const { user, api } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!user) router.replace("/"); }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SettingsPage apiFetch={api} onBack={() => router.push("/files")} />
    </div>
  );
}
