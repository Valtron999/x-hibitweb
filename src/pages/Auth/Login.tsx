import { Icons } from "@/constants/icons";
import { useAuth } from "@/hooks/useAuth";
import { useGoBack } from "@/hooks/useGoBack";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "@/components/Spinner";
import styles from "./Login.module.css";

export default function Login() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { signInWithUsername } = useAuth();
  const goBack = useGoBack("/home");

  const [form, setForm] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const canSubmit = form.username.trim().length > 0 && form.password.length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setLoginError("");

    const { error } = await signInWithUsername(form.username.trim(), form.password);

    setSubmitting(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    // If we were sent here from a gated screen (e.g. a shared post link),
    // go back there. Otherwise fall back to the main feed.
    const target = redirect && redirect.length > 0 ? redirect : "/home";
    navigate(target, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.iconButton} onClick={goBack} aria-label="Back">
            <img src={Icons.back} className={styles.backIcon} alt="" />
          </button>
          <span className={styles.headerTitle}>Log in</span>
          <span className={styles.headerSpacer} />
        </div>

        <div className={styles.form}>
          <label className={styles.label} htmlFor="username">
            Enter your username
          </label>
          <input
            id="username"
            className={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <label className={styles.label} htmlFor="password">
            Enter your password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              className={styles.input}
              placeholder="Password"
              type={visible ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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

          {loginError && <p className={styles.error}>{loginError}</p>}

          <div className={styles.linksRow}>
            <button className={styles.linkButton} onClick={() => navigate("/auth/signup")}>
              Don't have an account? Sign up
            </button>
            <button
              className={`${styles.linkButton} ${styles.mutedLink}`}
              onClick={() => navigate("/auth/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          <button
            className={styles.submitButton}
            disabled={!canSubmit}
            onClick={handleLogin}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? <Spinner /> : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
