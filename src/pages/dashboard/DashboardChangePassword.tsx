import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API = "http://127.0.0.1:8000/api";

function headers() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function DashboardChangePassword() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "Required";
    if (!newPass) errs.newPass = "Required";
    else if (newPass.length < 8) errs.newPass = "Minimum 8 characters";
    if (!confirm) errs.confirm = "Required";
    else if (newPass !== confirm) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/change-password`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          current_password: current,
          password: newPass,
          password_confirmation: confirm,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setCurrent(""); setNewPass(""); setConfirm("");
        toast({ title: "Password changed!", description: "Your password has been updated successfully." });
      } else {
        // Show backend validation errors
        if (data?.errors) {
          const backendErrs: Record<string, string> = {};
          if (data.errors.current_password) backendErrs.current = data.errors.current_password[0];
          if (data.errors.password) backendErrs.newPass = data.errors.password[0];
          if (data.errors.password_confirmation) backendErrs.confirm = data.errors.password_confirmation[0];
          setErrors(backendErrs);
        }
        toast({ title: "Error", description: data?.message || "Failed to change password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-6">Change Password</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password <span className="text-destructive">*</span></Label>
            <PasswordInput value={current} onChange={(e) => { setCurrent(e.target.value); setErrors((p) => ({ ...p, current: "" })); }} placeholder="Enter current password" error={errors.current} />
            {errors.current && <p className="text-xs text-destructive">{errors.current}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>New Password <span className="text-destructive">*</span></Label>
            <PasswordInput value={newPass} onChange={(e) => { setNewPass(e.target.value); setErrors((p) => ({ ...p, newPass: "" })); }} placeholder="Enter new password" showStrength error={errors.newPass} />
            {errors.newPass && <p className="text-xs text-destructive">{errors.newPass}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password <span className="text-destructive">*</span></Label>
            <PasswordInput value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }} placeholder="Re-enter new password" error={errors.confirm} />
            {confirm && newPass !== confirm && <p className="text-xs text-destructive">Passwords don't match</p>}
            {confirm && newPass === confirm && confirm.length > 0 && <p className="text-xs text-success">Passwords match ✓</p>}
            {errors.confirm && !confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}