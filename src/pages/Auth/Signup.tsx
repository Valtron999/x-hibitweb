import { Icons } from "@/constants/icons";
import { useAuth } from "@/hooks/useAuth";
import { useGoBack } from "@/hooks/useGoBack";
import { supabase } from "@/lib/supabase";
import { uploadProfileImage } from "@/lib/uploadImage";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "@/components/Spinner";
import styles from "./Signup.module.css";

// ---------- helpers ----------
const validateEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

const computePasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const getStrengthColor = (score: number) => {
  if (score <= 1) return "#ED3237";
  if (score <= 3) return "#FFA500";
  return "#66BC50";
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i); // most recent first

const computeAge = (dob: Date) => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

// ---------- steps ----------
type StepKey =
  | "name"
  | "email"
  | "password"
  | "username"
  | "dob"
  | "gender"
  | "category"
  | "photo"
  | "terms";

const STEPS: StepKey[] = [
  "name",
  "email",
  "password",
  "username",
  "dob",
  "gender",
  "category",
  "photo",
  "terms",
];

const OPTIONAL_STEPS: StepKey[] = ["photo"];

// ---------- reusable UI ----------

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className={styles.progressTrack}>
      <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function StepHeader({
  onBack,
  onSkip,
  progress,
}: {
  onBack: () => void;
  onSkip?: () => void;
  progress: number;
}) {
  return (
    <div>
      <div className={styles.header}>
        <button className={styles.iconButton} onClick={onBack} aria-label="Back">
          <img src={Icons.back} className={styles.backIcon} alt="" />
        </button>
        {onSkip ? (
          <button className={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
        ) : (
          <span style={{ width: 32 }} />
        )}
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}

function ContinueButton({
  label = "Continue",
  disabled,
  loading,
  onPress,
}: {
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onPress}
      className={styles.continueButton}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {loading ? <Spinner color="#030303" /> : label}
    </button>
  );
}

// ---------- date of birth picker ----------
// The original app used a native scroll-snap wheel picker. On web, plain
// <select> dropdowns give the same result with far better accessibility
// and no custom scroll-physics to reimplement.
function DOBPicker({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
}) {
  const initial = value ?? new Date(CURRENT_YEAR - 18, 0, 1);
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());

  useEffect(() => {
    onChange(new Date(year, month, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const age = useMemo(() => computeAge(new Date(year, month, 1)), [month, year]);

  return (
    <div className={styles.dobWrap}>
      <div className={styles.dobRow}>
        <select
          className={styles.dobSelect}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select
          className={styles.dobSelect}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.ageText}>{age} years old</p>
    </div>
  );
}

// ---------- main screen ----------

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const goBackToLanding = useGoBack("/auth");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const step = STEPS[stepIndex];

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    username: "",
    dob: "",
    dobDate: null as Date | null,
    gender: "" as "Male" | "Female" | "",
    category: "" as "artist" | "designer" | "photographer" | "model" | "",
    termsAgreed: false,
  });

  const [profileImage, setProfileImage] = useState<{ uri: string; mimeType?: string } | null>(null);
  const [errors, setErrors] = useState({ email: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const passwordScore = computePasswordStrength(form.password);

  const goToStep = (index: number) => {
    setFading(true);
    setTimeout(() => {
      setStepIndex(index);
      setFading(false);
    }, 120);
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) goToStep(stepIndex + 1);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      goBackToLanding();
    } else {
      goToStep(stepIndex - 1);
    }
  };

  const skip = () => {
    if (OPTIONAL_STEPS.includes(step)) goNext();
  };

  // per-step validity
  const isStepValid = (() => {
    switch (step) {
      case "name":
        return form.name.trim().length >= 2;
      case "email":
        return validateEmail(form.email);
      case "password":
        return passwordScore >= 2;
      case "username":
        return form.username.length >= 3;
      case "dob":
        return !!form.dobDate;
      case "gender":
        return !!form.gender;
      case "category":
        return !!form.category;
      case "photo":
        return true; // optional
      case "terms":
        return form.termsAgreed;
      default:
        return false;
    }
  })();

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setProfileImage({ uri, mimeType: file.type || undefined });
  };

  const handleSignUp = async () => {
    if (!isStepValid || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const { error, data } = (await signUp({
      email: form.email,
      password: form.password,
      name: form.name.trim(),
      username: form.username,
      category: form.category as "artist" | "designer" | "photographer" | "model",
      gender: form.gender.toLowerCase() as "male" | "female",
      dateOfBirth: form.dob,
    })) as any;

    if (error) {
      setSubmitting(false);
      setSubmitError(error.message);
      return;
    }

    // Best-effort avatar upload once we have a user id — never block signup on it
    const userId = data?.user?.id;
    if (userId && profileImage) {
      try {
        const publicUrl = await uploadProfileImage(profileImage.uri, userId, profileImage.mimeType);
        await supabase.from("profiles").update({ profile_picture: publicUrl }).eq("id", userId);
      } catch (err) {
        console.error("Profile picture upload failed:", err);
      } finally {
        URL.revokeObjectURL(profileImage.uri);
      }
    }

    setSubmitting(false);
    navigate("/home", { replace: true });
  };

  const handlePrimaryPress = () => {
    if (step === "terms") {
      handleSignUp();
    } else {
      goNext();
    }
  };

  const progress = (stepIndex + 1) / STEPS.length;

  // ---------- step content ----------
  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <>
            <h1 className={styles.title}>What's your name?</h1>
            <input
              autoFocus
              placeholder="Enter your full name"
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </>
        );

      case "email":
        return (
          <>
            <h1 className={styles.title}>What's your email address?</h1>
            <input
              autoFocus
              placeholder="Enter your email"
              type="email"
              autoCapitalize="none"
              className={styles.input}
              value={form.email}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, email: val });
                setErrors({ ...errors, email: validateEmail(val) ? "" : "Invalid email" });
              }}
            />
            {!!errors.email && !!form.email && <p className={styles.error}>{errors.email}</p>}
          </>
        );

      case "password":
        return (
          <>
            <h1 className={styles.title}>Create a password</h1>
            <div style={{ position: "relative" }}>
              <input
                autoFocus
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                className={styles.inputPassword}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <img src={showPassword ? Icons.hide : Icons.show} className={styles.eyeImage} alt="" />
              </button>
            </div>
            <div className={styles.passwordBarContainer}>
              <div
                className={styles.passwordBar}
                style={{
                  width: `${(passwordScore / 4) * 100}%`,
                  backgroundColor: getStrengthColor(passwordScore),
                }}
              />
            </div>
            <p className={styles.helperText}>Use 8 or more characters, numbers and symbols</p>
          </>
        );

      case "username":
        return (
          <>
            <h1 className={styles.title}>Choose a username</h1>
            <input
              autoFocus
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect="off"
              className={styles.input}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
            />
          </>
        );

      case "dob":
        return (
          <>
            <h1 className={styles.title}>
              Confirm your
              <br />
              date of birth
            </h1>
            <DOBPicker
              value={form.dobDate}
              onChange={(date) =>
                setForm({ ...form, dobDate: date, dob: date.toISOString().split("T")[0] })
              }
            />
          </>
        );

      case "gender":
        return (
          <>
            <h1 className={styles.title}>What's your gender?</h1>
            <div className={styles.genderContainer}>
              {(["Female", "Male"] as const).map((g) => {
                const selected = form.gender === g;
                return (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`${styles.genderOption} ${selected ? styles.optionSelected : ""}`}
                  >
                    <span className={selected ? styles.optionTextSelected : styles.optionText}>{g}</span>
                  </button>
                );
              })}
            </div>
          </>
        );

      case "category":
        return (
          <>
            <h1 className={styles.title}>What best describes you?</h1>
            <div className={styles.categoryContainer}>
              {(["artist", "designer", "photographer", "model"] as const).map((c) => {
                const selected = form.category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, category: c })}
                    className={`${styles.categoryOption} ${selected ? styles.optionSelected : ""}`}
                  >
                    <span
                      className={selected ? styles.optionTextSelected : styles.optionText}
                      style={{ textTransform: "capitalize" }}
                    >
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        );

      case "photo":
        return (
          <>
            <h1 className={styles.title}>
              Choose a
              <br />
              profile picture
            </h1>
            <div className={styles.avatarWrap}>
              <div className={styles.avatarCircle}>
                {profileImage ? (
                  <img src={profileImage.uri} className={styles.avatarImage} alt="" />
                ) : (
                  <img src={Icons.back} className={styles.avatarPlaceholderIcon} alt="" />
                )}
              </div>
              <button
                className={styles.avatarAddBadge}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose profile picture"
              >
                +
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChosen}
              />
            </div>
          </>
        );

      case "terms":
        return (
          <>
            <h1 className={styles.title}>Almost there</h1>
            <button
              onClick={() => setForm({ ...form, termsAgreed: !form.termsAgreed })}
              className={styles.termsContainer}
            >
              <span className={`${styles.checkbox} ${form.termsAgreed ? styles.checkboxChecked : ""}`} />
              <span className={styles.termsText}>
                By signing up you agree to our Terms and conditions and Privacy policy
              </span>
            </button>
            {!!submitError && <p className={styles.error}>{submitError}</p>}
          </>
        );
    }
  };

  const primaryLabel = step === "photo" ? "Save photo" : step === "terms" ? "Sign up" : "Continue";
  const primaryDisabled = step === "photo" ? !profileImage : !isStepValid;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <StepHeader
          onBack={goBack}
          onSkip={OPTIONAL_STEPS.includes(step) ? skip : undefined}
          progress={progress}
        />

        <div className={styles.scrollArea}>
          <div className={styles.stepContent} style={{ opacity: fading ? 0 : 1 }}>
            {renderStep()}
          </div>
        </div>

        <ContinueButton
          label={primaryLabel}
          disabled={primaryDisabled}
          loading={submitting && step === "terms"}
          onPress={step === "photo" ? goNext : handlePrimaryPress}
        />
        {step === "photo" && (
          <button onClick={goNext} className={styles.skipCenterButton}>
            Continue without photo
          </button>
        )}
      </div>
    </div>
  );
}
