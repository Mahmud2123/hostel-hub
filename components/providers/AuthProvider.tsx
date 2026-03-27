"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/types";
import type { Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

/**
 * Build an AuthUser from JWT metadata alone — zero network, always succeeds.
 * The DB sync below will upgrade name/role if the profile exists.
 */
function userFromJWT(session: Session): AuthUser {
  const meta = session.user.user_metadata ?? {};
  const appMeta = session.user.app_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name:
      (meta.name as string) ||
      session.user.email?.split("@")[0] ||
      "User",
    // Prefer user_metadata.role, fall back to app_metadata.role, then STUDENT
    role: ((meta.role ?? appMeta.role ?? "STUDENT") as AuthUser["role"]),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable single Supabase client for the lifetime of this provider
  const supabase  = useRef(createClient()).current;
  const mounted   = useRef(false);
  const syncing   = useRef(false);

  /**
   * Try to hydrate the user profile from the DB.
   * - Runs in the background, never blocks rendering.
   * - If the DB errors (RLS 500, table missing, network), swallows silently.
   *   The JWT-sourced user object is already rendered — users won't notice.
   * - Retries with exponential back-off (2s → 4s → 8s, max 3 attempts).
   */
  const syncProfile = useCallback(
    (userId: string, attempt = 1) => {
      if (syncing.current || !mounted.current) return;
      syncing.current = true;

      // Wrap in async IIFE so TS sees a proper Promise and we can use try/catch
      void (async () => {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("id, email, name, role")
            .eq("id", userId)
            .single();

          syncing.current = false;
          if (!mounted.current) return;

          if (error) {
            if (attempt < 3) {
              setTimeout(() => syncProfile(userId, attempt + 1), attempt * 2000);
            }
            return;
          }

          if (data) {
            setUser((prev) => {
              if (!prev) return prev;
              const nameChanged = prev.name !== data.name;
              const roleChanged = prev.role !== data.role;
              return nameChanged || roleChanged
                ? ({ ...prev, name: data.name, role: data.role } as AuthUser)
                : prev;
            });
          }
        } catch {
          syncing.current = false;
          // Network error — JWT fallback stays rendered
        }
      })();
    },
    [supabase]
  );

  useEffect(() => {
    mounted.current = true;

    // ── Step 1: Restore session from localStorage (synchronous-ish, no network) ──
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      if (session) {
        setSession(session);
        setUser(userFromJWT(session)); // instant — from JWT
        syncProfile(session.user.id); // background — from DB
      }
      setLoading(false);
    });

    // ── Step 2: Listen for auth state changes (sign-in, sign-out, refresh) ──
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      setSession(session);
      if (session) {
        setUser(userFromJWT(session));   // instant
        syncProfile(session.user.id);    // background
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    void supabase.auth.signOut();
    // Hard redirect — clears React state and avoids RSC cascade
    window.location.href = "/";
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
