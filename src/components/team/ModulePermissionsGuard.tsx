import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { ROUTES } from "../../config/routes";

interface Props {
  permission: string;
  children: React.ReactNode;
}

export function ModulePermissionsGuard({ permission, children }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to={ROUTES.Login} replace />;

  const isAdmin = user.role === "admin";
  const hasPermission = isAdmin || (user.section_permissions ?? []).includes(permission);

  if (!hasPermission) return <Navigate to={ROUTES.Dashboard} replace />;

  return <>{children}</>;
}
