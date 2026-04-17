import { useState, useMemo } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  showStrength?: boolean;
  id?: string;
  name?: string;
  error?: string;
}

const requirements = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One special character", test: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

export function PasswordInput({ value, onChange, placeholder = "Enter password", showStrength = false, id, name, error }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const strength = useMemo(() => {
    if (!value) return 0;
    return requirements.filter((r) => r.test(value)).length;
  }, [value]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-destructive", "bg-accent", "bg-accent", "bg-success"][strength];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn("pr-10", error && "border-destructive focus-visible:ring-destructive")}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && value && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i <= strength ? strengthColor : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className={cn("text-xs font-medium", strength <= 1 ? "text-destructive" : strength <= 2 ? "text-accent-foreground" : "text-success")}>
            {strengthLabel}
          </p>
          <ul className="space-y-1">
            {requirements.map((req) => (
              <li key={req.label} className="flex items-center gap-1.5 text-xs">
                {req.test(value) ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <X className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={req.test(value) ? "text-success" : "text-muted-foreground"}>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
