import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";

interface OtpVerificationModalProps {
  open: boolean;
  email: string;
  onVerified: () => void;
}

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 6;

export function OtpVerificationModal({ open, email, onVerified }: OtpVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  // Send OTP jab modal khule
  useEffect(() => {
    if (!open) return;
    setOtp("");
    setError("");
    setResendTimer(RESEND_COOLDOWN);
    setCanResend(false);
    sendOtp();
  }, [open]);

  useEffect(() => {
    if (!open || canResend) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, canResend]);

  const getToken = () => localStorage.getItem("auth_token") || "";

  const sendOtp = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("Send OTP error:", err);
    }
  };

  const handleVerify = useCallback(async () => {
    if (otp.length < OTP_LENGTH) {
      setError("Please enter the full verification code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid verification code. Please try again.");
        setOtp("");
      } else {
        onVerified();
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [otp, onVerified]);

  const handleResend = async () => {
    setCanResend(false);
    setResendTimer(RESEND_COOLDOWN);
    setError("");
    setOtp("");
    await sendOtp();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <style>{`.absolute.right-4.top-4 { display: none !important; }`}</style>
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Verify Your Email</DialogTitle>
          <DialogDescription className="text-sm">
            We've sent a {OTP_LENGTH}-digit verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              setError("");
            }}
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg font-semibold" />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button onClick={handleVerify} disabled={loading || otp.length < OTP_LENGTH} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            {canResend ? (
              <button onClick={handleResend} className="text-primary font-semibold hover:underline">
                Resend Code
              </button>
            ) : (
              <span className="text-muted-foreground">
                Resend in <span className="font-semibold text-foreground">{resendTimer}s</span>
              </span>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}