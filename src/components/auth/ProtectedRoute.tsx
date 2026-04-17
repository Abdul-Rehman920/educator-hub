import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  allowedRole: "teacher" | "student";
}

export function ProtectedRoute({ children, allowedRole }: Props) {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const role = user.role?.[0]?.name;

    if (role !== allowedRole) {
      // Galat role hai — sahi dashboard pe bhejo
      if (role === "teacher") return <Navigate to="/dashboard" replace />;
      if (role === "student") return <Navigate to="/student" replace />;
      return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}