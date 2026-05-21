import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { postgrest } from "../lib/postgrest";
import { useAuthStore } from "../store/auth-store";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { MemberTable } from "../components/team/MemberTable";
import { MemberModal } from "../components/team/MemberModal";
import type { User } from "../types/aios";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export default function TeamPage() {
  const { data: members, loading, error, refetch } = useQuery<User>("users", {
    order: "name.asc",
  });
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | undefined>();
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  function openAdd() {
    setEditTarget(undefined);
    setModalMode("add");
    setModalOpen(true);
  }

  function openEdit(member: User) {
    setEditTarget(member);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function handleAdd(data: {
    name: string;
    email: string;
    role: User["role"];
    password: string;
  }) {
    const res = await fetch(`${API_URL}/team/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to create member");
    }
    refetch();
  }

  async function handleEdit(id: string, role: User["role"]) {
    await postgrest.patch<User>("users", { id: `eq.${id}` }, { role });
    refetch();
  }

  async function handleToggleActive(member: User) {
    await postgrest.patch<User>("users", { id: `eq.${member.id}` }, { is_active: !member.is_active });
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Team"
        description="Manage your workspace members"
        actions={
          isAdmin ? (
            <Button size="sm" onClick={openAdd}>
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-danger">{error}</div>
      ) : (
        <MemberTable
          members={members}
          currentUserId={user?.id ?? ""}
          isAdmin={isAdmin}
          onEdit={openEdit}
          onToggleActive={(m) => void handleToggleActive(m)}
        />
      )}

      <MemberModal
        open={modalOpen}
        mode={modalMode}
        member={editTarget}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
    </PageTransition>
  );
}
