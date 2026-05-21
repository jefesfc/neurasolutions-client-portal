import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { User } from "../../types/aios";

const ROLE_BADGE: Record<
  User["role"],
  { variant: "default" | "success" | "warning" | "info" | "neutral"; label: string }
> = {
  admin:   { variant: "default", label: "Admin"   },
  manager: { variant: "info",    label: "Manager" },
  user:    { variant: "neutral", label: "User"    },
};

interface Props {
  members: User[];
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (member: User) => void;
  onToggleActive: (member: User) => void;
}

export function MemberTable({ members, currentUserId, isAdmin, onEdit, onToggleActive }: Props) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
      {members.length === 0 ? (
        <div className="p-12 text-center text-surface-400">No team members found</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50">
              <th className="text-left px-4 py-3 font-medium text-surface-500">Member</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
              {isAdmin && (
                <th className="text-right px-4 py-3 font-medium text-surface-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatar ?? undefined} fallback={m.name} size="sm" />
                    <span className="font-medium text-surface-900">
                      {m.name}
                      {m.id === currentUserId && (
                        <span className="ml-2 text-xs text-surface-400">(you)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-surface-500">{m.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_BADGE[m.role].variant}>{ROLE_BADGE[m.role].label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.is_active ? "success" : "neutral"} dot>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {m.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(m)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleActive(m)}
                          className={
                            m.is_active
                              ? "text-danger hover:text-danger"
                              : "text-positive hover:text-positive"
                          }
                        >
                          {m.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
