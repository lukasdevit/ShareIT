"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserInfo } from "@/lib/types";

type AuthResult =
  | { isReady: false; user: null }
  | { isReady: true; user: UserInfo };

/**
 * Redirect to login if not authenticated.
 * Set `requireAdmin = true` to also enforce admin role.
 *
 * Returns a discriminated union — after `if (!isReady) return null`,
 * TypeScript knows `user` is non-null.
 */
export function useRequireAuth(requireAdmin = false): AuthResult {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }
    if (requireAdmin && !user.isAdmin) {
      router.replace("/files");
    }
  }, [user, router, requireAdmin]);

  const isReady = !!user && (!requireAdmin || user.isAdmin);
  if (isReady) {
    return { isReady: true, user: user! };
  }
  return { isReady: false, user: null };
}

