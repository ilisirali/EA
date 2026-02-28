/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    language?: string
  ) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, language?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const checkBlockedStatus = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (data?.is_blocked) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setRoleLoading(true);
        Promise.all([
          checkAdminRole(session.user.id),
          checkBlockedStatus(session.user.id)
        ]).finally(() => setRoleLoading(false));
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }

      setLoading(false);
    });

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setRoleLoading(true);
        Promise.all([
          checkAdminRole(session.user.id),
          checkBlockedStatus(session.user.id)
        ]).finally(() => setRoleLoading(false));
      } else {
        setRoleLoading(false);
      }

      setLoading(false);
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    language: string = "tr"
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return { error, data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  const resetPassword = async (email: string, language: string = "tr") => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, loading, roleLoading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
