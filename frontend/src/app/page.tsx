"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/api";
import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to files
  useEffect(() => {
    if (user) router.replace("/files");
  }, [user, router]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
      setUsername(""); setPassword("");
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 text-zinc-100">
      <LoginForm
        mode={mode} username={username} password={password} error={error}
        onModeChange={setMode} onUsernameChange={setUsername}
        onPasswordChange={setPassword} onSubmit={handleSubmit}
      />
    </div>
  );
}
