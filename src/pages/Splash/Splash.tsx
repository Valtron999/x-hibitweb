import { Images } from "@/constants/images";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Splash.module.css";

const PRELOAD_IMAGES = [
  Images.logo,
  Images.art1,
  Images.art2,
  Images.art3,
  Images.art4,
  Images.art5,
  Images.art6,
  Images.onboardingbg,
  Images.join,
  Images.discover,
  Images.share,
];

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // don't block the splash on one bad asset
    img.src = src;
  });
}

export default function Splash() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [assetsReady, setAssetsReady] = useState(false);

  // Preload assets, enforcing a minimum splash duration so it doesn't flash by
  useEffect(() => {
    let mounted = true;
    const MIN_MS = 2000;
    const start = Date.now();

    const preload = async () => {
      try {
        await Promise.all(PRELOAD_IMAGES.map(preloadImage));
      } catch (err) {
        console.warn("Asset preload failed:", err);
      }

      if (!mounted) return;
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        if (mounted) setAssetsReady(true);
      }, wait);
    };

    preload();

    return () => {
      mounted = false;
    };
  }, []);

  // Only redirect once BOTH assets are ready AND we know the auth state —
  // otherwise a logged-in user could flash onboarding before session loads.
  useEffect(() => {
    if (!assetsReady || authLoading) return;

    if (session) {
      navigate("/home", { replace: true }); // already logged in → straight to home
    } else {
      navigate("/onboarding", { replace: true }); // no session → onboarding flow
    }
  }, [assetsReady, authLoading, session, navigate]);

  return (
    <div className={styles.container}>
      <img src={Images.logo} className={styles.logo} alt="x-hibit" />
      <p className={styles.tagline}>Imagination to creation</p>
    </div>
  );
}
