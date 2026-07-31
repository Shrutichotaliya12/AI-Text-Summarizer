import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mail,
  Lock,
  Cpu,
  ArrowLeft,
  Chrome,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  User,
  Globe,
  Clock,
  Unlock,
  KeyRound,
  Shield,
  Sparkles,
  Check,
  X,
  UserPlus,
  LogIn,
  Send,
  RotateCcw,
  PartyPopper,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/state";
import { apiClient } from "@/api";
import { useTranslation } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

type ScreenState =
  | "landing"
  | "login"
  | "signup"
  | "otp"
  | "forgot"
  | "reset"
  | "account_not_found"
  | "email_exists"
  | "account_created"
  | "otp_expired"
  | "wrong_otp"
  | "wrong_password"
  | "email_verified"
  | "login_success"
  | "password_updated";

/* ──────────────────────────────────────────────
   Password Strength Utilities
   ────────────────────────────────────────────── */

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "Minimum 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  { label: "One special character", test: (pw) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(pw) },
];

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 1, label: "Weak", color: "rgb(239, 68, 68)" };
  if (passed <= 2) return { level: 2, label: "Medium", color: "rgb(245, 158, 11)" };
  if (passed <= 4) return { level: 3, label: "Strong", color: "rgb(16, 185, 129)" };
  return { level: 4, label: "Excellent", color: "rgb(59, 130, 246)" };
}

/* ──────────────────────────────────────────────
   Animated Background Component
   ────────────────────────────────────────────── */

const AuthBackground: React.FC = () => (
  <>
    {/* Inline keyframes for auth-only animations */}
    <style>{`
      @keyframes auth-gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes auth-float-1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
      }
      @keyframes auth-float-2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(-40px, 30px) scale(1.15); }
        66% { transform: translate(25px, -40px) scale(0.85); }
      }
      @keyframes auth-float-3 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(15px, -25px); }
      }
      @keyframes auth-glow-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.05); }
      }
      @keyframes auth-grid-move {
        0% { transform: translateY(0); }
        100% { transform: translateY(24px); }
      }
    `}</style>

    {/* Base gradient — theme-aware */}
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(135deg, rgb(var(--bg-app)) 0%, rgb(var(--bg-surface)) 50%, rgb(var(--bg-app)) 100%)",
        backgroundSize: "400% 400%",
        animation: "auth-gradient-shift 15s ease infinite",
      }}
    />

    {/* Subtle grid mesh */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "linear-gradient(rgb(var(--text-muted)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--text-muted)) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        animation: "auth-grid-move 8s linear infinite",
      }}
    />

    {/* Floating orbs */}
    <div
      className="absolute top-[10%] right-[15%] w-[340px] h-[340px] rounded-full opacity-20 pointer-events-none"
      style={{
        background: "radial-gradient(circle, rgb(var(--primary)) 0%, transparent 70%)",
        animation: "auth-float-1 20s ease-in-out infinite",
        filter: "blur(60px)",
      }}
    />
    <div
      className="absolute bottom-[5%] left-[10%] w-[280px] h-[280px] rounded-full opacity-15 pointer-events-none"
      style={{
        background: "radial-gradient(circle, rgb(var(--accent)) 0%, transparent 70%)",
        animation: "auth-float-2 25s ease-in-out infinite",
        filter: "blur(80px)",
      }}
    />
    <div
      className="absolute top-[50%] left-[50%] w-[200px] h-[200px] rounded-full opacity-10 pointer-events-none"
      style={{
        background: "radial-gradient(circle, rgb(var(--success)) 0%, transparent 70%)",
        animation: "auth-float-3 18s ease-in-out infinite",
        filter: "blur(60px)",
        transform: "translate(-50%, -50%)",
      }}
    />
  </>
);

/* ──────────────────────────────────────────────
   Animated AI Logo Component
   ────────────────────────────────────────────── */

const AiLogo: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
  const dims = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-16 h-16" };
  const iconDims = { sm: "w-5 h-5", md: "w-7 h-7", lg: "w-8 h-8" };

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow ring */}
      <div
        className={`absolute ${dims[size]} rounded-2xl`}
        style={{
          background: "rgb(var(--primary))",
          opacity: 0.2,
          filter: "blur(12px)",
          animation: "auth-glow-pulse 3s ease-in-out infinite",
        }}
      />
      {/* Icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={`relative ${dims[size]} rounded-2xl flex items-center justify-center shadow-lg`}
        style={{
          background: "linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))",
        }}
      >
        <Cpu className={`${iconDims[size]} text-white`} />
      </motion.div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Reusable Input Field Component
   ────────────────────────────────────────────── */

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  required?: boolean;
  rightElement?: React.ReactNode;
  autoFocus?: boolean;
  autoComplete?: string;
}

const AuthInput: React.FC<AuthInputProps> = ({
  id, label, type = "text", value, onChange, placeholder, icon, required, rightElement, autoFocus, autoComplete,
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[11px] font-semibold tracking-wide" style={{ color: "rgb(var(--text-muted))" }}>
      {label}
    </label>
    <div className="relative flex items-center">
      <span className="absolute left-3.5 flex items-center" style={{ color: "rgb(var(--text-muted))" }}>
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-label={label}
        className="w-full pl-10 pr-11 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 outline-none"
        style={{
          backgroundColor: "rgb(var(--bg-app))",
          border: "1.5px solid rgb(var(--border-token))",
          color: "rgb(var(--text-main))",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgb(var(--primary))";
          e.target.style.boxShadow = "0 0 0 3px rgba(var(--primary), 0.1)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgb(var(--border-token))";
          e.target.style.boxShadow = "none";
        }}
      />
      {rightElement && (
        <span className="absolute right-3.5 flex items-center">
          {rightElement}
        </span>
      )}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   Primary Action Button
   ────────────────────────────────────────────── */

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "outline" | "success" | "ghost";
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  children, isLoading, variant = "primary", icon, fullWidth = true, className = "", ...props
}) => {
  const base = "relative flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-200 text-[13px] py-3 px-5 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none font-display";

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))",
      color: "#fff",
      boxShadow: "0 4px 14px rgba(var(--primary), 0.3)",
    },
    outline: {
      background: "transparent",
      color: "rgb(var(--text-main))",
      border: "1.5px solid rgb(var(--border-token))",
    },
    success: {
      background: "linear-gradient(135deg, rgb(var(--success)), rgb(16, 160, 110))",
      color: "#fff",
      boxShadow: "0 4px 14px rgba(var(--success), 0.3)",
    },
    ghost: {
      background: "transparent",
      color: "rgb(var(--text-muted))",
    },
  };

  return (
    <button
      className={`${base} ${fullWidth ? "w-full" : ""} ${className}`}
      style={variants[variant]}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

/* ──────────────────────────────────────────────
   Divider with text
   ────────────────────────────────────────────── */

const Divider: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px" style={{ background: "rgb(var(--border-token))" }} />
    {text && (
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--text-muted))" }}>
        {text}
      </span>
    )}
    <div className="flex-1 h-px" style={{ background: "rgb(var(--border-token))" }} />
  </div>
);

/* ──────────────────────────────────────────────
   Status Screen (Success / Error)
   ────────────────────────────────────────────── */

interface StatusScreenProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  pulse?: boolean;
}

const StatusScreen: React.FC<StatusScreenProps> = ({ icon, iconColor, title, description, children, pulse }) => (
  <div className="flex flex-col items-center text-center gap-4 py-4">
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
      className={`w-16 h-16 rounded-full flex items-center justify-center ${pulse ? "animate-pulse" : ""}`}
      style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
    >
      {icon}
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-2"
    >
      <h3 className="text-lg font-bold font-display" style={{ color: "rgb(var(--text-main))" }}>
        {title}
      </h3>
      <p className="text-[12px] leading-relaxed max-w-[300px] mx-auto" style={{ color: "rgb(var(--text-muted))" }}>
        {description}
      </p>
    </motion.div>
    {children && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-2.5 w-full mt-1"
      >
        {children}
      </motion.div>
    )}
  </div>
);

/* ──────────────────────────────────────────────
   Password Strength Meter
   ────────────────────────────────────────────── */

const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Meter bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: seg <= strength.level ? strength.color : "rgb(var(--border-token))",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold" style={{ color: strength.color }}>
        {strength.label}
      </span>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Password Rules Checklist
   ────────────────────────────────────────────── */

const PasswordRulesChecklist: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;

  return (
    <div className="grid grid-cols-1 gap-1 mt-1">
      {PASSWORD_RULES.map((rule, i) => {
        const passed = rule.test(password);
        return (
          <div key={i} className="flex items-center gap-2">
            {passed ? (
              <Check className="w-3 h-3 shrink-0" style={{ color: "rgb(var(--success))" }} />
            ) : (
              <X className="w-3 h-3 shrink-0" style={{ color: "rgb(var(--text-muted))", opacity: 0.4 }} />
            )}
            <span
              className="text-[10px] font-medium transition-colors duration-200"
              style={{ color: passed ? "rgb(var(--success))" : "rgb(var(--text-muted))" }}
            >
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────────────────────────────────────
   MAIN AUTH COMPONENT
   ────────────────────────────────────────────── */

export const Auth: React.FC = () => {
  const { login } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();
  const { success, error: toastError } = useToast();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>("login");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreePolicy, setAgreePolicy] = useState(false);

  // OTP states
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpTimeLeft, setOtpTimeLeft] = useState(300);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [activeAction, setActiveAction] = useState<"signup" | "forgot_password">("signup");

  // Loading
  const [isLoading, setIsLoading] = useState(false);
  const [hasGoogleClientId, setHasGoogleClientId] = useState(false);

  // OTP refs
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Google sign in initialized ref
  const googleInitializedRef = useRef(false);

  // ────── Theme auto-detection on mount ──────
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    } else if (savedTheme === "light") {
      document.body.classList.remove("dark");
    }
  }, []);

  // ────── OTP Countdown ──────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpTimeLeft > 0 && currentScreen === "otp") {
      timer = setInterval(() => {
        setOtpTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (otpTimeLeft === 0 && currentScreen === "otp") {
      setCurrentScreen("otp_expired");
    }
    return () => clearInterval(timer);
  }, [otpTimeLeft, currentScreen]);

  // ────── Resend Countdown ──────
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // ────── Focus first OTP input ──────
  useEffect(() => {
    if (currentScreen === "otp") {
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    }
  }, [currentScreen]);

  // ────── Google Sign-In ──────
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const initGoogle = async () => {
      try {
        const envClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
        let clientId = envClientId;
        if (!clientId) {
          const configRes = await apiClient.get("/auth/google-client-id");
          clientId = configRes.data.google_client_id;
        }

        if (!clientId) return;

        setHasGoogleClientId(true);

        const renderGoogleButton = () => {
          if ((window as any).google) {
            if (!googleInitializedRef.current) {
              googleInitializedRef.current = true;
              (window as any).google.accounts.id.initialize({
                client_id: clientId,
                prompt: "select_account",
                callback: async (response: any) => {
                  setIsLoading(true);
                  try {
                    const authRes = await apiClient.post("/auth/google", { token: response.credential });
                    const { access_token, email: userEmail } = authRes.data;
                    success("Welcome Back");
                    setTimeout(() => {
                      login({ email: userEmail }, access_token);
                    }, 1000);
                  } catch (e: any) {
                    toastError("Failed to authenticate Google token.");
                  } finally {
                    setIsLoading(false);
                  }
                },
              });
            }

            const btnDiv = document.getElementById("google-signin-btn");
            if (btnDiv) {
              (window as any).google.accounts.id.renderButton(btnDiv, {
                theme: "outline",
                size: "large",
                width: 320,
                text: "continue_with",
              });
              return true; // render success
            }
          }
          return false; // not ready yet
        };

        // Try to render immediately, if it fails then poll
        if (!renderGoogleButton()) {
          interval = setInterval(() => {
            if (renderGoogleButton()) {
              clearInterval(interval);
            }
          }, 100);
          
          // Stop polling after 5 seconds to avoid memory leaks
          setTimeout(() => clearInterval(interval), 5000);
        }
      } catch (err) {
        console.error("Failed to initialize Google button:", err);
      }
    };

    if (currentScreen === "login" || currentScreen === "signup") {
      initGoogle();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen]);

  /* ────── Handlers ────── */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post("/auth/login", { email, password, remember_me: rememberMe });
      const { access_token, email: userEmail } = response.data;

      setCurrentScreen("login_success");
      setTimeout(() => {
        login({ email: userEmail }, access_token);
      }, 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;

      if (status === 404) {
        setCurrentScreen("account_not_found");
      } else if (status === 401) {
        setCurrentScreen("wrong_password");
      } else if (status === 403 && detail === "Email verification required") {
        setActiveAction("signup");
        setOtpTimeLeft(300);
        setCurrentScreen("otp");
        success("A verification code has been sent to your email.");
      } else {
        toastError(detail || "Connection Error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }
    if (!agreePolicy) {
      toastError("Please agree to the Privacy Policy to continue.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/register", {
        email,
        password,
        name: fullName,
      });
      localStorage.setItem("pending_fullname", fullName);
      setActiveAction("signup");
      setOtpTimeLeft(300);
      setResendCountdown(60);
      setCurrentScreen("account_created");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail === "Email Already Registered") {
        setCurrentScreen("email_exists");
      } else {
        toastError(detail || "Failed to create account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalOtp = otpDigits.join("");
    if (finalOtp.length < 6) {
      toastError("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post("/auth/verify-otp", {
        email,
        otp: finalOtp,
        action: activeAction,
      });

      if (activeAction === "signup") {
        const { access_token, email: userEmail } = response.data;
        const pendingName = localStorage.getItem("pending_fullname");
        if (pendingName) {
          try {
            await apiClient.put("/auth/profile", { name: pendingName }, {
              headers: { Authorization: `Bearer ${access_token}` },
            });
            localStorage.removeItem("pending_fullname");
          } catch (e) {
            console.error(e);
          }
        }

        setCurrentScreen("email_verified");
        localStorage.setItem("token", access_token);
        localStorage.setItem("email", userEmail);
      } else {
        success("Code verified successfully.");
        setCurrentScreen("reset");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail === "OTP code expired") {
        setCurrentScreen("otp_expired");
      } else {
        setCurrentScreen("wrong_otp");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setActiveAction("forgot_password");
      setOtpTimeLeft(300);
      setResendCountdown(60);
      setCurrentScreen("otp");
      success("Reset password OTP code sent.");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setCurrentScreen("account_not_found");
      } else {
        toastError("Failed to initiate password reset.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const finalOtp = otpDigits.join("");
      await apiClient.post("/auth/reset-password", {
        email,
        otp: finalOtp,
        new_password: password,
      });
      setCurrentScreen("password_updated");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    try {
      await apiClient.post("/auth/resend-otp", {
        email,
        action: activeAction,
      });
      setOtpTimeLeft(300);
      setResendCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      success("A new verification code has been sent to your email.");
      if (currentScreen === "otp_expired" || currentScreen === "wrong_otp") {
        setCurrentScreen("otp");
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Resend failed.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ────── OTP Input Handlers ────── */

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal[0];
    setOtpDigits(newDigits);
    if (index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedText.length === 6) {
      setOtpDigits(pastedText.split(""));
      otpRefs[5].current?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const languagesList = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "gu", label: "Gujarati" },
    { code: "de", label: "German" },
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
  ];

  /* ────── Screen transition animation config ────── */

  const screenTransition = {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -16, scale: 0.98 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  };

  /* ────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden select-none">

      {/* Animated background */}
      <AuthBackground />

      {/* Language selector — top right */}
      <div
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-md"
        style={{
          background: "rgba(var(--bg-surface), 0.6)",
          border: "1px solid rgba(var(--border-token), 0.5)",
        }}
      >
        <Globe className="w-3.5 h-3.5" style={{ color: "rgb(var(--text-muted))" }} />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as any)}
          className="bg-transparent text-[10px] font-bold tracking-wide outline-none cursor-pointer uppercase"
          style={{ color: "rgb(var(--text-muted))" }}
          aria-label="Select language"
        >
          {languagesList.map((lang) => (
            <option key={lang.code} value={lang.code} style={{ background: "rgb(var(--bg-surface))", color: "rgb(var(--text-main))" }}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main card container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          {...screenTransition}
          className="relative z-10 w-full max-w-[420px] mx-4"
        >
          {/* Glassmorphism card */}
          <div
            className="rounded-2xl p-8 md:p-10 flex flex-col gap-6 backdrop-blur-xl"
            style={{
              background: "rgba(var(--bg-surface), 0.72)",
              border: "1px solid rgba(var(--border-token), 0.5)",
              boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(var(--border-token), 0.1)",
            }}
          >

            {/* ═══════════════════════════════════
                SCREEN: LANDING (Welcome)
               ═══════════════════════════════════ */}
            {/* ═══════════════════════════════════
                SCREEN: LOGIN
               ═══════════════════════════════════ */}
            {currentScreen === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <AiLogo size="sm" />
                  <h2 className="text-lg font-bold font-display mt-1" style={{ color: "rgb(var(--text-main))" }}>
                    Welcome back
                  </h2>
                  <p className="text-[11px]" style={{ color: "rgb(var(--text-muted))" }}>
                    Sign in to your account to continue
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Google sign-in button */}
                  {hasGoogleClientId ? (
                    <div id="google-signin-btn" className="w-full flex justify-center mt-1" />
                  ) : (
                    <AuthButton
                      variant="outline"
                      icon={<Chrome className="w-4 h-4" style={{ color: "rgb(239, 68, 68)" }} />}
                      onClick={() => handleLogin({ preventDefault: () => {} } as any)}
                    >
                      Continue with Google
                    </AuthButton>
                  )}

                  <Divider text="or" />

                  <AuthInput
                    id="login-email"
                    label={t("auth_label_email")}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder={t("auth_placeholder_email")}
                    icon={<Mail className="w-4 h-4" />}
                    required
                    autoFocus
                    autoComplete="email"
                  />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-password" className="text-[11px] font-semibold tracking-wide" style={{ color: "rgb(var(--text-muted))" }}>
                        {t("auth_label_password")}
                      </label>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen("forgot")}
                        className="text-[11px] font-semibold hover:underline underline-offset-2 transition-colors"
                        style={{ color: "rgb(var(--primary))" }}
                      >
                        {t("auth_forgot_link")}
                      </button>
                    </div>
                    <AuthInput
                      id="login-password"
                      label=""
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      required
                      autoComplete="current-password"
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="transition-colors hover:opacity-70"
                          style={{ color: "rgb(var(--text-muted))" }}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* Remember me */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div
                        className="w-4 h-4 rounded border-[1.5px] transition-all duration-200 flex items-center justify-center peer-checked:border-transparent"
                        style={{
                          borderColor: rememberMe ? "rgb(var(--primary))" : "rgb(var(--border-token))",
                          backgroundColor: rememberMe ? "rgb(var(--primary))" : "transparent",
                        }}
                      >
                        {rememberMe && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: "rgb(var(--text-muted))" }}>
                      {t("auth_remember_me")}
                    </span>
                  </label>
                </div>

                <AuthButton type="submit" isLoading={isLoading} icon={<LogIn className="w-4 h-4" />}>
                  {t("auth_btn_login")}
                </AuthButton>

                {/* Footer nav */}
                <div className="text-center pt-3" style={{ borderTop: "1px solid rgb(var(--border-token))" }}>
                  <span className="text-[12px]" style={{ color: "rgb(var(--text-muted))" }}>
                    Don't have an account?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("");
                      setPassword("");
                      setCurrentScreen("signup");
                    }}
                    className="text-[12px] font-semibold hover:underline underline-offset-2"
                    style={{ color: "rgb(var(--primary))" }}
                  >
                    Create one
                  </button>
                </div>
              </form>
            )}

            {currentScreen === "signup" && (
              <form onSubmit={handleSignup} className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <AiLogo size="sm" />
                  <h2 className="text-lg font-bold font-display mt-1" style={{ color: "rgb(var(--text-main))" }}>
                    Create your account
                  </h2>
                  <p className="text-[11px]" style={{ color: "rgb(var(--text-muted))" }}>
                    Start summarizing documents with AI
                  </p>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Google sign-in button */}
                  {hasGoogleClientId ? (
                    <div id="google-signin-btn" className="w-full flex justify-center mt-1" />
                  ) : (
                    <AuthButton
                      variant="outline"
                      icon={<Chrome className="w-4 h-4" style={{ color: "rgb(239, 68, 68)" }} />}
                      onClick={() => handleLogin({ preventDefault: () => {} } as any)}
                    >
                      Continue with Google
                    </AuthButton>
                  )}

                  <Divider text="or" />

                  <AuthInput
                    id="signup-name"
                    label="Full Name"
                    type="text"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Your full name"
                    icon={<User className="w-4 h-4" />}
                    required
                    autoFocus
                    autoComplete="name"
                  />

                  <AuthInput
                    id="signup-email"
                    label={t("auth_label_email")}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder={t("auth_placeholder_email")}
                    icon={<Mail className="w-4 h-4" />}
                    required
                    autoComplete="email"
                  />

                  <AuthInput
                    id="signup-password"
                    label={t("auth_label_password")}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a strong password"
                    icon={<Lock className="w-4 h-4" />}
                    required
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="transition-colors hover:opacity-70"
                        style={{ color: "rgb(var(--text-muted))" }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* Password Strength + Rules */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-col gap-2 overflow-hidden"
                    >
                      <PasswordStrengthMeter password={password} />
                      <PasswordRulesChecklist password={password} />
                    </motion.div>
                  )}

                  <AuthInput
                    id="signup-confirm"
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-enter your password"
                    icon={<Lock className="w-4 h-4" />}
                    required
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="transition-colors hover:opacity-70"
                        style={{ color: "rgb(var(--text-muted))" }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* Privacy policy checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreePolicy}
                        onChange={(e) => setAgreePolicy(e.target.checked)}
                        className="sr-only peer"
                        required
                      />
                      <div
                        className="w-4 h-4 rounded border-[1.5px] transition-all duration-200 flex items-center justify-center peer-checked:border-transparent"
                        style={{
                          borderColor: agreePolicy ? "rgb(var(--primary))" : "rgb(var(--border-token))",
                          backgroundColor: agreePolicy ? "rgb(var(--primary))" : "transparent",
                        }}
                      >
                        {agreePolicy && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-[11px] leading-relaxed" style={{ color: "rgb(var(--text-muted))" }}>
                      I agree to the{" "}
                      <span className="underline underline-offset-2 font-semibold" style={{ color: "rgb(var(--primary))" }}>Privacy Policy</span>{" "}
                      and{" "}
                      <span className="underline underline-offset-2 font-semibold" style={{ color: "rgb(var(--primary))" }}>Terms of Service</span>
                    </span>
                  </label>
                </div>

                <AuthButton type="submit" isLoading={isLoading} icon={<UserPlus className="w-4 h-4" />}>
                  {t("auth_btn_create")}
                </AuthButton>

                {/* Footer nav */}
                <div className="text-center pt-3" style={{ borderTop: "1px solid rgb(var(--border-token))" }}>
                  <span className="text-[12px]" style={{ color: "rgb(var(--text-muted))" }}>
                    Already have an account?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("");
                      setPassword("");
                      setCurrentScreen("login");
                    }}
                    className="text-[12px] font-semibold hover:underline underline-offset-2"
                    style={{ color: "rgb(var(--primary))" }}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════════════════════════
                SCREEN: OTP VERIFICATION
               ═══════════════════════════════════ */}
            {currentScreen === "otp" && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(var(--primary), 0.1)" }}
                  >
                    <ShieldCheck className="w-7 h-7" style={{ color: "rgb(var(--primary))" }} />
                  </motion.div>
                  <h2 className="text-lg font-bold font-display mt-1" style={{ color: "rgb(var(--text-main))" }}>
                    Verification Code
                  </h2>
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgb(var(--text-muted))" }}>
                    We have sent a verification code to
                  </p>
                  <p className="text-[12px] font-semibold" style={{ color: "rgb(var(--text-main))" }}>
                    {email}
                  </p>
                </div>

                {/* 6 OTP boxes */}
                <div className="flex justify-center items-center gap-2.5 mt-1">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      aria-label={`Digit ${index + 1}`}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl transition-all duration-200 outline-none font-mono"
                      style={{
                        backgroundColor: "rgb(var(--bg-app))",
                        border: digit
                          ? "2px solid rgb(var(--primary))"
                          : "1.5px solid rgb(var(--border-token))",
                        color: "rgb(var(--text-main))",
                        boxShadow: digit ? "0 0 0 3px rgba(var(--primary), 0.08)" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Timer & Resend */}
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" style={{ color: "rgb(var(--primary))" }} />
                    <span className="text-[10px] font-semibold" style={{ color: "rgb(var(--text-muted))" }}>
                      Expires in:
                    </span>
                    <span
                      className="text-[11px] font-bold font-mono"
                      style={{ color: otpTimeLeft <= 60 ? "rgb(var(--danger))" : "rgb(var(--text-main))" }}
                    >
                      {formatTime(otpTimeLeft)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={resendCountdown > 0}
                    onClick={handleResendOtp}
                    className="text-[11px] font-semibold hover:underline underline-offset-2 disabled:opacity-40 disabled:no-underline transition-opacity"
                    style={{ color: "rgb(var(--primary))" }}
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                  </button>
                </div>

                <AuthButton type="submit" isLoading={isLoading} icon={<Shield className="w-4 h-4" />}>
                  Verify OTP
                </AuthButton>

                <button
                  type="button"
                  onClick={() => setCurrentScreen(activeAction === "signup" ? "signup" : "forgot")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-70"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </form>
            )}

            {/* ═══════════════════════════════════
                SCREEN: FORGOT PASSWORD
               ═══════════════════════════════════ */}
            {currentScreen === "forgot" && (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(var(--warning), 0.1)" }}
                  >
                    <KeyRound className="w-7 h-7" style={{ color: "rgb(var(--warning))" }} />
                  </motion.div>
                  <h2 className="text-lg font-bold font-display mt-1" style={{ color: "rgb(var(--text-main))" }}>
                    Reset Password
                  </h2>
                  <p className="text-[11px] leading-relaxed max-w-[280px]" style={{ color: "rgb(var(--text-muted))" }}>
                    Enter your registered email address to receive a verification code.
                  </p>
                </div>

                <AuthInput
                  id="forgot-email"
                  label={t("auth_label_email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder={t("auth_placeholder_email")}
                  icon={<Mail className="w-4 h-4" />}
                  required
                  autoFocus
                  autoComplete="email"
                />

                <AuthButton type="submit" isLoading={isLoading} icon={<Send className="w-4 h-4" />}>
                  {t("auth_btn_send_otp")}
                </AuthButton>

                <button
                  type="button"
                  onClick={() => setCurrentScreen("login")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-70"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </form>
            )}

            {/* ═══════════════════════════════════
                SCREEN: RESET PASSWORD
               ═══════════════════════════════════ */}
            {currentScreen === "reset" && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(var(--primary), 0.1)" }}
                  >
                    <Lock className="w-7 h-7" style={{ color: "rgb(var(--primary))" }} />
                  </motion.div>
                  <h2 className="text-lg font-bold font-display mt-1" style={{ color: "rgb(var(--text-main))" }}>
                    Set New Password
                  </h2>
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgb(var(--text-muted))" }}>
                    Create a new password for your account
                  </p>
                </div>

                <div className="flex flex-col gap-3.5">
                  <AuthInput
                    id="reset-password"
                    label={t("auth_label_new_password")}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                    required
                    autoFocus
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="transition-colors hover:opacity-70"
                        style={{ color: "rgb(var(--text-muted))" }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <PasswordStrengthMeter password={password} />
                    </motion.div>
                  )}

                  <AuthInput
                    id="reset-confirm"
                    label={t("auth_label_confirm_password")}
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <AuthButton type="submit" isLoading={isLoading} icon={<RotateCcw className="w-4 h-4" />}>
                  {t("auth_btn_reset")}
                </AuthButton>

                <button
                  type="button"
                  onClick={() => setCurrentScreen("login")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-70"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </form>
            )}

            {/* ═══════════════════════════════════
                SUCCESS / ERROR STATUS SCREENS
               ═══════════════════════════════════ */}

            {/* Account Not Found */}
            {currentScreen === "account_not_found" && (
              <StatusScreen
                icon={<AlertTriangle className="w-8 h-8" />}
                iconColor="rgb(245, 158, 11)"
                title="Account Not Found"
                description="We couldn't find an account associated with this email address. Please create a new account to continue."
              >
                <AuthButton icon={<UserPlus className="w-4 h-4" />} onClick={() => setCurrentScreen("signup")}>
                  Create Account
                </AuthButton>
                <AuthButton variant="outline" onClick={() => setCurrentScreen("login")}>
                  Back to Login
                </AuthButton>
              </StatusScreen>
            )}

            {/* Email Already Exists */}
            {currentScreen === "email_exists" && (
              <StatusScreen
                icon={<Mail className="w-8 h-8" />}
                iconColor="rgb(var(--primary))"
                title="Email Already Registered"
                description="This email is already associated with an existing account. Please log in instead."
              >
                <AuthButton icon={<LogIn className="w-4 h-4" />} onClick={() => setCurrentScreen("login")}>
                  Go to Login
                </AuthButton>
                <AuthButton variant="outline" icon={<KeyRound className="w-4 h-4" />} onClick={() => setCurrentScreen("forgot")}>
                  Reset Password
                </AuthButton>
              </StatusScreen>
            )}

            {/* Account Created */}
            {currentScreen === "account_created" && (
              <StatusScreen
                icon={<PartyPopper className="w-8 h-8" />}
                iconColor="rgb(var(--success))"
                title="Account Created Successfully"
                description="Welcome! Your account has been created. We've sent a verification code to your email address."
                pulse
              >
                <AuthButton variant="success" icon={<Shield className="w-4 h-4" />} onClick={() => setCurrentScreen("otp")}>
                  Verify Email
                </AuthButton>
              </StatusScreen>
            )}

            {/* Wrong OTP */}
            {currentScreen === "wrong_otp" && (
              <StatusScreen
                icon={<X className="w-8 h-8" />}
                iconColor="rgb(var(--danger))"
                title="Invalid Verification Code"
                description="The verification code you entered is incorrect. Please try again."
              >
                <AuthButton
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => { setOtpDigits(["", "", "", "", "", ""]); setCurrentScreen("otp"); }}
                >
                  Try Again
                </AuthButton>
              </StatusScreen>
            )}

            {/* OTP Expired */}
            {currentScreen === "otp_expired" && (
              <StatusScreen
                icon={<Clock className="w-8 h-8" />}
                iconColor="rgb(var(--danger))"
                title="Verification Code Expired"
                description="Your verification code has expired. Please request a new code."
              >
                <AuthButton isLoading={isLoading} icon={<Send className="w-4 h-4" />} onClick={handleResendOtp}>
                  Resend OTP
                </AuthButton>
              </StatusScreen>
            )}

            {/* Email Verified */}
            {currentScreen === "email_verified" && (
              <StatusScreen
                icon={<CheckCircle className="w-8 h-8" />}
                iconColor="rgb(var(--success))"
                title="Email Verified Successfully"
                description="Your email address has been verified. You can now access your account."
                pulse
              >
                <AuthButton
                  variant="success"
                  icon={<Sparkles className="w-4 h-4" />}
                  onClick={() => {
                    const token = localStorage.getItem("token");
                    const userEmail = localStorage.getItem("email");
                    if (token && userEmail) {
                      login({ email: userEmail }, token);
                    }
                  }}
                >
                  Continue to Dashboard
                </AuthButton>
              </StatusScreen>
            )}

            {/* Login Success */}
            {currentScreen === "login_success" && (
              <StatusScreen
                icon={<CheckCircle className="w-8 h-8" />}
                iconColor="rgb(var(--success))"
                title="Welcome Back"
                description="Login successful. Redirecting to your dashboard..."
                pulse
              >
                <div className="flex justify-center">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" style={{ color: "rgb(var(--primary))" }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </StatusScreen>
            )}

            {/* Wrong Password */}
            {currentScreen === "wrong_password" && (
              <StatusScreen
                icon={<Unlock className="w-8 h-8" />}
                iconColor="rgb(var(--danger))"
                title="Incorrect Password"
                description="The password you entered is incorrect. Please try again or reset your password."
              >
                <AuthButton icon={<LogIn className="w-4 h-4" />} onClick={() => setCurrentScreen("login")}>
                  Try Again
                </AuthButton>
                <AuthButton variant="outline" icon={<KeyRound className="w-4 h-4" />} onClick={() => setCurrentScreen("forgot")}>
                  Reset Password
                </AuthButton>
              </StatusScreen>
            )}

            {/* Password Updated */}
            {currentScreen === "password_updated" && (
              <StatusScreen
                icon={<CheckCircle className="w-8 h-8" />}
                iconColor="rgb(var(--success))"
                title="Password Updated Successfully"
                description="Your password has been updated. Please log in using your new password."
                pulse
              >
                <AuthButton variant="success" icon={<LogIn className="w-4 h-4" />} onClick={() => setCurrentScreen("login")}>
                  Sign In
                </AuthButton>
              </StatusScreen>
            )}

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Auth;
