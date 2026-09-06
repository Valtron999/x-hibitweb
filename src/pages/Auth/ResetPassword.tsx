import { Icons } from "@/constants/icons";
import { useAuth } from "@/hooks/useAuth";
import { useGoBack } from "@/hooks/useGoBack";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "@/components/Spinner";
import styles from "./Login.module.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const { verifyRecoveryCode, updatePassword } = useAuth();
  const goBack = useGoBack("/auth/login");

  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const canSubmit =
    code.trim().length > 0 &&
    newPassword.length >= 6 &&
    typeof email === "string" &&
    email.length > 0 &&
    !submitting;

  const handleReset = async () => {
    if (!canSubmit || typeof email !== "string") return;

    setSubmitting(true);
    setFormError("");

    const { error: verifyError } = await verifyRecoveryCode(email, code.trim());

    if (verifyError) {
      setSubmitting(false);
      setFormError(verifyError.message);
      return;
    }

    const { error: updateError } = await updatePassword(newPassword);

    setSubmitting(false);

    if (updateError) {
      setFormError(updateError.message);
      return;
    }

    // Password is changed and verifyOtp already left us with an active
    // session, so we can drop straight into the app.
    navigate("/home", { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.iconButton} onClick={goBack} aria-label="Back">
            <img src={Icons.back} className={styles.backIcon} alt="" />
          </button>
          <span className={styles.headerTitle}>Enter code</span>
          <span className={styles.headerSpacer} />
        </div>

        <div className={styles.form}>
          <label className={styles.label} htmlFor="code">
            Check your email
          </label>
          <p className={styles.hint}>
            Enter the OTP we sent{email ? ` to ${email}` : ""}, then choose a new password.
          </p>

          <input
            id="code"
            className={styles.input}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginTop: 16 }}
          />

          <label className={styles.label} htmlFor="new-password">
            New password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="new-password"
              className={styles.input}
              placeholder="New password"
              type={visible ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              <img src={visible ? Icons.hide : Icons.show} className={styles.eyeIcon} alt="" />
            </button>
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <button
            className={styles.submitButton}
            disabled={!canSubmit}
            onClick={handleReset}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? <Spinner /> : "Reset password"}
          </button>
        </div>
      </div>
    </div>
  );
}
