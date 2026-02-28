/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/LanguageSelector";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { Logo } from "@/components/Logo";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_blocked: boolean;
  created_at: string;
  role: "admin" | "staff";
}

const AdminPanel = () => {
  const { user, isAdmin, loading: authLoading, roleLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  /* ---------------- FETCH USERS ---------------- */
  useEffect(() => {
    if (isAdmin) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,email,full_name,is_blocked,created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id,role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserProfile[] = (profiles || []).map(
        (profile: any) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);

          return {
            ...profile,
            role: userRole?.role || "staff",
          };
        }
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error(error);
      toast.error(t("adminPanel.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ADD USER ---------------- */
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast.error(t("adminPanel.fillAllFields"));
      return;
    }

    setAddingUser(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        const errorMsg = await (async () => {
          if (typeof response.error === 'object' && 'context' in response.error) {
            try {
              const body = await (response.error as any).context.json();
              if (body && body.error) return body.error;
            } catch (e) {
              console.error("Could not parse error body", e);
            }
          }
          return response.error.message;
        })();

        throw new Error(errorMsg || t("adminPanel.addError"));
      }

      toast.success(t("adminPanel.userAdded"));

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      setIsAddDialogOpen(false);

      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t("adminPanel.addError"));
    } finally {
      setAddingUser(false);
    }
  };

  /* ---------------- DELETE USER ---------------- */
  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log("Calling Edge Function with token:", !!session?.access_token);

      const response = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", userId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      console.log("Edge Function Response Data:", response.data);
      console.log("Edge Function Response Error:", response.error);

      if (response.error) {
        const errorMsg = await (async () => {
          if (typeof response.error === 'object' && 'context' in response.error) {
            try {
              const body = await (response.error as any).context.json();
              if (body && body.error) return body.error;
            } catch (e) {
              console.error("Could not parse error body", e);
            }
          }
          return response.error.message;
        })();

        throw new Error(errorMsg || t("adminPanel.deleteError"));
      }

      toast.success(t("adminPanel.userDeleted"));
      fetchUsers();
    } catch (error: any) {
      console.error("Delete error details:", error);
      toast.error(error.message || t("adminPanel.deleteError"));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------- BLOCK / UNBLOCK ---------------- */
  const handleToggleBlock = async (
    userId: string,
    currentlyBlocked: boolean
  ) => {
    setActionLoading(userId);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: !currentlyBlocked })
        .eq("id", userId);

      if (error) throw error;

      toast.success(
        currentlyBlocked ? t("adminPanel.userUnblocked") : t("adminPanel.userBlocked")
      );

      fetchUsers();
    } catch {
      toast.error(t("adminPanel.blockError"));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------- ROLE CHANGE (ADMIN VER / AL) ---------------- */
  const handleToggleRole = async (
    userId: string,
    currentRole: "admin" | "staff"
  ) => {
    setActionLoading(userId);

    try {
      const newRole = currentRole === "admin" ? "staff" : "admin";

      await supabase.from("user_roles").delete().eq("user_id", userId);

      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
      });

      if (error) throw error;

      toast.success(
        newRole === "admin"
          ? t("adminPanel.adminAssigned")
          : t("adminPanel.adminRemoved")
      );

      fetchUsers();
    } catch (error) {
      toast.error(t("adminPanel.blockError"));
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------- AUTH GUARDS ---------------- */
  if (authLoading || roleLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 bg-card border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Logo className="h-7 hidden sm:block" />

            <h1 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('adminPanel.title')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('adminPanel.addUserTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('adminPanel.addUserDesc')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div>
                    <Label>{t('auth.fullName')}</Label>
                    <Input
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>{t('auth.email')}</Label>
                    <Input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>{t('auth.password')}</Label>
                    <Input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleAddUser}
                    disabled={addingUser}
                  >
                    {addingUser && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t('adminPanel.addUser')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* TABLE */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminPanel.name')}</TableHead>
                  <TableHead>{t('auth.email')}</TableHead>
                  <TableHead>{t('adminPanel.role')}</TableHead>
                  <TableHead>{t('adminPanel.status')}</TableHead>
                  <TableHead className="text-right">{t('adminPanel.actions')}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name || "-"}</TableCell>
                    <TableCell>{u.email}</TableCell>

                    <TableCell>
                      <Badge>
                        {u.role === "admin" ? t('index.admin') : t('adminPanel.staff')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {u.is_blocked ? (
                        <Badge variant="destructive">{t('adminPanel.blocked')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('adminPanel.active')}</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {u.id !== user.id && (
                        <div className="flex gap-2 justify-end">

                          {/* ROLE BUTTON */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleToggleRole(u.id, u.role)
                            }
                            disabled={actionLoading === u.id}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>

                          {/* BLOCK BUTTON */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleToggleBlock(u.id, u.is_blocked)
                            }
                            disabled={actionLoading === u.id}
                          >
                            {u.is_blocked ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </Button>

                          {/* DELETE */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('adminPanel.deleteConfirmTitle')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('adminPanel.deleteConfirmDesc').replace('{name}', u.full_name || u.email)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('edit.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u.id)}
                                >
                                  {t('adminPanel.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
