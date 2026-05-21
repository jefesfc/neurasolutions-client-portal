import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { User } from "../../types/aios";

type Mode = "add" | "edit";

interface Props {
  open: boolean;
  mode: Mode;
  member?: User;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    email: string;
    role: User["role"];
    password: string;
  }) => Promise<void>;
  onEdit: (id: string, role: User["role"]) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: "admin",   label: "Admin"   },
  { value: "manager", label: "Manager" },
  { value: "user",    label: "User"    },
];

export function MemberModal({ open, mode, member, onClose, onAdd, onEdit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("user");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setEmail(member?.email ?? "");
      setRole(member?.role ?? "user");
      setPassword("");
      setError(null);
    }
  }, [open, member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "add") {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError("All fields are required");
          return;
        }
        await onAdd({ name: name.trim(), email: email.trim(), role, password });
      } else {
        await onEdit(member!.id, role);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Team Member" : "Edit Member"}
      description={
        mode === "add"
          ? "Create a new user in your workspace."
          : "Update this member's role."
      }
      size="sm"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === "add" && (
          <>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                required
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Role</label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            options={ROLE_OPTIONS}
          />
        </div>
        {mode === "add" && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Temporary Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "add" ? "Add Member" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
