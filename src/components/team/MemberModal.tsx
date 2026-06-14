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
    section_permissions: string[];
  }) => Promise<void>;
  onEdit: (id: string, role: User["role"], sectionPermissions: string[]) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: "admin",   label: "Admin"   },
  { value: "manager", label: "Manager" },
  { value: "user",    label: "User"    },
];

const MODULE_OPTIONS: { key: string; label: string }[] = [
  { key: "leads",         label: "Leads"         },
  { key: "crm",           label: "Clients"       },
  { key: "invoicing",     label: "Invoicing"     },
  { key: "billing",       label: "Billing"       },
  { key: "calendar",      label: "Calendar"      },
  { key: "emails",        label: "Emails"        },
  { key: "usage",         label: "Usage"         },
  { key: "ai_systems",    label: "AI Systems"    },
  { key: "analytics",     label: "Analytics"     },
  { key: "reports",       label: "Reports"       },
  { key: "support",       label: "Support"       },
  { key: "team",          label: "Team"          },
  { key: "notifications", label: "Notifications" },
  { key: "knowledge",     label: "Knowledge Base" },
];

export function MemberModal({ open, mode, member, onClose, onAdd, onEdit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("user");
  const [password, setPassword] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setEmail(member?.email ?? "");
      setRole(member?.role ?? "user");
      setPassword("");
      setSelectedModules(member?.section_permissions ?? []);
      setError(null);
    }
  }, [open, member]);

  function toggleModule(key: string) {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectAll() {
    setSelectedModules(MODULE_OPTIONS.map((m) => m.key));
  }

  function clearAll() {
    setSelectedModules([]);
  }

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
        await onAdd({ name: name.trim(), email: email.trim(), role, password, section_permissions: selectedModules });
      } else {
        await onEdit(member!.id, role, selectedModules);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const isAdminRole = role === "admin";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Team Member" : "Edit Member"}
      description={
        mode === "add"
          ? "Create a new user in your workspace."
          : "Update this member's role and module access."
      }
      size="sm"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === "add" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <Select
            value={role}
            onChange={(e) => {
              const newRole = e.target.value as User["role"];
              setRole(newRole);
              if (newRole === "admin") setSelectedModules([]);
            }}
            options={ROLE_OPTIONS}
          />
        </div>
        {mode === "add" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
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

        {/* Module access */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Module Access
            </label>
            {!isAdminRole && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  All
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  None
                </button>
              </div>
            )}
          </div>
          {isAdminRole ? (
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              Admin users have access to all modules.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 rounded-lg p-3">
              {MODULE_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(key)}
                    onChange={() => toggleModule(key)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-700 group-hover:text-slate-800">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

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
