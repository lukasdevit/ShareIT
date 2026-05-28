"use client";

interface Props {
  mode: "login" | "register";
  username: string;
  password: string;
  error: string | null;
  onModeChange: (mode: "login" | "register") => void;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({ mode, username, password, error, onModeChange, onUsernameChange, onPasswordChange, onSubmit }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto px-4 pb-32">
      <div className="w-full p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 mb-4">
          <img src="/logo.svg" alt="" className="w-8 h-8" />
          <span className="text-lg font-semibold text-zinc-200">ShareIT</span>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          {mode === "login" ? "Sign in to access your files." : "Register to start uploading."}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Username"
            aria-label="Username"
            className="w-full px-3 py-2 rounded-md text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-500"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="w-full px-3 py-2 rounded-md text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" className="w-full py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => onModeChange(mode === "login" ? "register" : "login")}
            className="text-blue-400 hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
