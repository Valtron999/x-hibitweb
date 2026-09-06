import { Icons } from "@/constants/icons";
import { useAuth } from "@/hooks/useAuth";
import { useGoBack } from "@/hooks/useGoBack";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "@/components/Spinner";
import styles from "./Login.module.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const goBack = useGoBack("/auth/login");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const canSubmit = email.trim().length > 0 && !submitting;

  const handleSend = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError("");

    const { email: resolvedEmail, error } = await forgotPassword(email.trim());

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    // Pass the email along so the next screen doesn't need the user to retype it.
    navigate(`/auth/reset-password?email=${encodeURIComponent(resolvedEmail ?? "")}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.iconButton} onClick={goBack} aria-label="Back">
            <img src={Icons.back} className={styles.backIcon} alt="" />
          </button>
          <span className={styles.headerTitle}>Reset password</span>
          <span className={styles.headerSpacer} />
        </div>

        <div className={styles.form}>
          <label className={styles.label} htmlFor="email">
            Enter your email
          </label>
          <p className={styles.hint}>We'll email an OTP to reset your password.</p>
          <input
            id="email"
            className={styles.input}
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginTop: 16 }}
          />

          {formError && <p className={styles.error}>{formError}</p>}

          <button
            className={styles.submitButton}
            disabled={!canSubmit}
            onClick={handleSend}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? <Spinner /> : "Send code"}
          </button>
        </div>
      </div>
    </div>
  );
}
