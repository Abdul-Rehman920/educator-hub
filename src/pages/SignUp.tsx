import { useState, useMemo, useRef } from "react";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Mail, Phone, Loader2, CheckCircle, Upload, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { countries } from "@/lib/countries";
import { toast } from "@/hooks/use-toast";
import { OtpVerificationModal } from "@/components/auth/OtpVerificationModal";

type Role = "teacher" | "student";
type AgeGroup = "" | "18+" | "under18";

export default function SignUp() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const userRole: Role = role === "student" ? "student" : "teacher";
  const label = userRole === "teacher" ? "Teacher" : "Student";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    country: "",
    email: "",
    phoneCode: "+1",
    phone: "",
    password: "",
    confirmPassword: "",
    guardianName: "",
    guardianEmail: "",
  });
  const [guardianPhotoId, setGuardianPhotoId] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOtp, setShowOtp] = useState(false);

  const set = (key: string, val: string) => {
    setForm((p) => {
      const next = { ...p, [key]: val };
      if (key === "phone" || key === "country") {
        const phone = key === "phone" ? val : p.phone;
        const code = key === "country"
          ? (countries.find((c) => c.name === val)?.phone || p.phoneCode)
          : p.phoneCode;
        if (phone.length > 0) {
          const fullNumber = `${code}${phone}`;
          const countryCode = countries.find((c) => c.phone === code)?.code || "";
          try {
            if (!isValidPhoneNumber(fullNumber, countryCode as any)) {
              setErrors((prev) => ({ ...prev, phone: "Your phone number is incorrect" }));
            } else {
              setErrors((prev) => ({ ...prev, phone: "" }));
            }
          } catch {
            setErrors((prev) => ({ ...prev, phone: "Your phone number is incorrect" }));
          }
        } else {
          setErrors((prev) => ({ ...prev, phone: "" }));
        }
      } else {
        setErrors((prev) => ({ ...prev, [key]: "" }));
      }
      return next;
    });
  };

  const passwordValid = useMemo(() => {
    const p = form.password;
    return p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p);
  }, [form.password]);

  const isMinor = ageGroup === "under18";

  const validate = () => {
    const errs: Record<string, string> = {};
    if (userRole === "student" && !ageGroup) errs.ageGroup = "Please select your age group";
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.country) errs.country = "Country is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else {
      const fullNumber = `${form.phoneCode}${form.phone}`;
      const countryCode = countries.find((c) => c.phone === form.phoneCode)?.code || "";
      try {
        if (!isValidPhoneNumber(fullNumber, countryCode as any)) {
          errs.phone = "Your phone number is incorrect";
        }
      } catch {
        errs.phone = "Your phone number is incorrect";
      }
    }
    if (!form.password) errs.password = "Password is required";
    else if (!passwordValid) errs.password = "Password doesn't meet requirements";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";
    if (isMinor) {
      if (!form.guardianName.trim()) errs.guardianName = "Parent/Guardian name is required";
      if (!form.guardianEmail.trim()) errs.guardianEmail = "Parent/Guardian email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardianEmail)) errs.guardianEmail = "Invalid email format";
      if (!guardianPhotoId) errs.guardianPhotoId = "Photo ID is required for parental verification";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const countriesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get/countries`);
      const countriesData = await countriesRes.json();
      const backendCountry = countriesData.find((c: any) =>
        c.name.toLowerCase() === form.country.toLowerCase()
      );
      const countryId = backendCountry?.id || 171;
      const callingDigits = backendCountry?.calling_digits || "10";

      const formData = new FormData();
      // FIX: Send "name" as firstName only, and "last_name" separately
      formData.append("name", form.firstName.trim());
      formData.append("last_name", form.lastName.trim());
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("password_confirmation", form.confirmPassword);
      formData.append("user_type", userRole);
      formData.append("country_id", countryId.toString());
      formData.append("calling_digits", callingDigits);
      formData.append("phone", form.phone);
      if (isMinor) {
        formData.append("under_18", "1");
        formData.append("parent_name", form.guardianName);
        formData.append("parent_email", form.guardianEmail);
        if (guardianPhotoId) {
          formData.append("id_card_image", guardianPhotoId);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (!response.ok) {
        const firstError = Object.values(data.errors || {})?.[0];
        toast({
          title: "Registration Failed",
          description: Array.isArray(firstError) ? firstError[0] : data.message || "Something went wrong",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      localStorage.setItem("auth_token", data.data?.token || data.token);
      localStorage.setItem("user", JSON.stringify(data.data?.user || data.user));

      setLoading(false);
      setShowOtp(true);

    } catch (error) {
      console.error("Register error:", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleOtpVerified = () => {
    setShowOtp(false);
    toast({ title: "Account created!", description: `Your ${label.toLowerCase()} account is ready.` });
    const signupData = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      country: form.country,
      email: form.email,
      phone: form.phone,
    };
    const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ");
    localStorage.setItem("userName", displayName);
    localStorage.setItem("userRole", userRole === "teacher" ? "Educator" : "Student");
    localStorage.removeItem("userAvatar");
    if (userRole === "teacher") {
      navigate("/dashboard/profile", { state: signupData });
      return;
    }
    navigate("/student/profile", {
      state: {
        ...signupData,
        ...(isMinor ? {
          isMinor: true,
          guardianName: form.guardianName,
          guardianEmail: form.guardianEmail,
          guardianPhotoIdName: guardianPhotoId?.name || "",
        } : {}),
      },
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl shadow-floating p-10 border border-border text-center max-w-md w-full"
        >
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Account Created!</h2>
          <p className="text-muted-foreground mb-6">
            Your {label.toLowerCase()} account has been created successfully. You can now log in and get started.
          </p>
          <Button onClick={() => navigate("/login")} size="lg" className="w-full">
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  const showForm = userRole === "teacher" || ageGroup !== "";

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-3xl shadow-floating p-8 sm:p-10 border border-border">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Educator<span className="text-primary"> Hub</span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-center text-foreground mb-1">
            Create {label} Account
          </h1>
          <p className="text-center text-muted-foreground mb-6 text-sm">
            {userRole === "teacher" ? "Share your knowledge with students worldwide" : "Find the perfect tutor for your needs"}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Link
              to="/signup/teacher"
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${userRole === "teacher" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              Teacher
            </Link>
            <Link
              to="/signup/student"
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${userRole === "student" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              Student
            </Link>
          </div>

          {userRole === "student" && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold text-foreground">Age Verification <span className="text-destructive">*</span></Label>
              </div>
              <RadioGroup
                value={ageGroup}
                onValueChange={(val) => {
                  setAgeGroup(val as AgeGroup);
                  setErrors((p) => ({ ...p, ageGroup: "" }));
                }}
                className="space-y-2"
              >
                <label
                  htmlFor="age-18plus"
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${ageGroup === "18+" ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground/30"}`}
                >
                  <RadioGroupItem value="18+" id="age-18plus" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Yes, I am 18 years or older</span>
                  </div>
                </label>
                <label
                  htmlFor="age-under18"
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${ageGroup === "under18" ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground/30"}`}
                >
                  <RadioGroupItem value="under18" id="age-under18" />
                  <div>
                    <span className="text-sm font-medium text-foreground">No, I am under 18</span>
                    <p className="text-xs text-muted-foreground">Parent/Guardian consent required</p>
                  </div>
                </label>
              </RadioGroup>
              {errors.ageGroup && <p className="text-xs text-destructive mt-1">{errors.ageGroup}</p>}
            </div>
          )}

          <AnimatePresence mode="wait">
            {showForm && (
              <motion.div
                key={ageGroup}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                {isMinor && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent/10 border border-accent/30 mb-5">
                    <AlertTriangle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground/80">
                      Since you are under 18, a parent or guardian must provide their details and upload a valid photo ID for verification. Your account will be reviewed before activation.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                      <Input id="firstName" placeholder="John" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={errors.firstName ? "border-destructive" : ""} />
                      {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input id="middleName" placeholder="(optional)" value={form.middleName} onChange={(e) => set("middleName", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="lastName" placeholder="Doe" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={errors.lastName ? "border-destructive" : ""} />
                    {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                    <select
                      id="country"
                      value={form.country}
                      onChange={(e) => {
                        set("country", e.target.value);
                        const c = countries.find((x) => x.name === e.target.value);
                        if (c) setForm((p) => ({ ...p, phoneCode: c.phone }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select country</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} className={`pl-10 ${errors.email ? "border-destructive" : ""}`} />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 h-10 px-3 rounded-md border border-input bg-muted text-sm min-w-[80px] justify-center">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{form.phoneCode}</span>
                      </div>
                      <Input id="phone" placeholder="1234567890" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} className={`flex-1 ${errors.phone ? "border-destructive" : ""}`} />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <PasswordInput
                      id="password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Create a strong password"
                      showStrength
                      error={errors.password}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)}
                      placeholder="Re-enter your password"
                      error={errors.confirmPassword}
                    />
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-destructive">Passwords don't match</p>
                    )}
                    {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                      <p className="text-xs text-success">Passwords match ✓</p>
                    )}
                    {errors.confirmPassword && !form.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  {isMinor && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 border-t border-border pt-4">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Parent / Guardian Details</h3>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-2">
                        These details are for the parent or guardian, not the student.
                      </p>

                      <div className="space-y-1.5">
                        <Label htmlFor="guardianName">Parent/Guardian Full Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="guardianName"
                          placeholder="e.g. Jane Doe"
                          value={form.guardianName}
                          onChange={(e) => set("guardianName", e.target.value)}
                          className={errors.guardianName ? "border-destructive" : ""}
                        />
                        {errors.guardianName && <p className="text-xs text-destructive">{errors.guardianName}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="guardianEmail">Parent/Guardian Email <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="guardianEmail"
                            type="email"
                            placeholder="parent@example.com"
                            value={form.guardianEmail}
                            onChange={(e) => set("guardianEmail", e.target.value)}
                            className={`pl-10 ${errors.guardianEmail ? "border-destructive" : ""}`}
                          />
                        </div>
                        {errors.guardianEmail && <p className="text-xs text-destructive">{errors.guardianEmail}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label>Parent/Guardian Photo ID <span className="text-destructive">*</span></Label>
                        <p className="text-xs text-muted-foreground">Upload a valid government-issued photo ID for verification.</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setGuardianPhotoId(file);
                            setErrors((p) => ({ ...p, guardianPhotoId: "" }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed transition-colors ${
                            guardianPhotoId
                              ? "border-primary bg-primary/5"
                              : errors.guardianPhotoId
                              ? "border-destructive bg-destructive/5"
                              : "border-input hover:border-muted-foreground/40"
                          }`}
                        >
                          {guardianPhotoId ? (
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="truncate max-w-[200px]">{guardianPhotoId.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(guardianPhotoId.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                              <Upload className="w-5 h-5" />
                              <span className="text-xs">Click to upload photo ID (PNG, JPG)</span>
                            </div>
                          )}
                        </button>
                        {errors.guardianPhotoId && <p className="text-xs text-destructive">{errors.guardianPhotoId}</p>}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loading ? "Creating Account..." : `Create ${label} Account`}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-5">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Log In</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <OtpVerificationModal
        open={showOtp}
        email={form.email}
        onVerified={handleOtpVerified}
      />
    </div>
  );
}