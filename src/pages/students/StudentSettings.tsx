import { useState } from "react";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { toast } from "@/hooks/use-toast";

const API = "http://127.0.0.1:8000/api";

function headers() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function StudentSettings() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast({ title: "Error", description: "Passwords don't match.", variant: "destructive" });
      return;
    }
    if (passwords.new.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/change-password`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          current_password: passwords.current,
          password: passwords.new,
          password_confirmation: passwords.confirm,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswords({ current: "", new: "", confirm: "" });
        toast({ title: "Password updated!", description: "Your password has been changed." });
      } else {
        // Show specific backend error
        const errMsg = data?.errors?.current_password?.[0]
          || data?.errors?.password?.[0]
          || data?.message
          || "Failed to change password.";
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {/* Notifications */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Notifications</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive email updates about sessions, messages, and promotions</p>
              </div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Change Password</h3>
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <PasswordInput
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <PasswordInput
                value={passwords.new}
                onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                placeholder="Enter new password"
                showStrength
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <PasswordInput
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  );
}