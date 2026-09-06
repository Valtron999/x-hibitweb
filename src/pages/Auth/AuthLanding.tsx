import { Images } from "@/constants/images";
import { useNavigate } from "react-router-dom";
import styles from "./AuthLanding.module.css";

type FloatingImage = {
  id: number;
  source: string;
  style: React.CSSProperties;
};

const floatingImages: FloatingImage[] = [
  { id: 1, source: Images.art1, style: { top: -90, right: -25, width: 194, height: 257 } },
  { id: 2, source: Images.art2, style: { top: 140, right: 150, width: 160, height: 97 } },
  { id: 3, source: Images.art3, style: { top: 200, left: -25, width: 194, height: 173 } },
  { id: 4, source: Images.art4, style: { top: 100, right: 80, width: 194, height: 257 } },
  { id: 5, source: Images.art5, style: { top: -90, left: -25, width: 194, height: 257 } },
  { id: 6, source: Images.art6, style: { top: 200, right: -25, width: 100, height: 100 } },
];

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.collage}>
        {floatingImages.map((item, index) => (
          <div
            key={item.id}
            className={styles.card}
            style={{ ...item.style, animationDelay: `${index * 140}ms` }}
          >
            <img src={item.source} className={styles.image} alt="" />
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <img src={Images.logo} className={styles.logo} alt="x-hibit" />
        <p className={styles.tagline}>Imagination to creation</p>

        <button
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={() => navigate("/auth/signup")}
        >
          Get Started
        </button>

        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => navigate("/auth/login")}
        >
          Log in
        </button>
      </div>
    </div>
  );
}
