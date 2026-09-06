import { Images } from "@/constants/images";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Onboarding.module.css";

const slides = [
  {
    image: Images.join,
    text: "Be part of a creative community",
  },
  {
    image: Images.discover,
    text: "Explore new art every day",
  },
  {
    image: Images.share,
    text: "Turn your art into impact",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // SLIDE + FADE LOGIC — fade out, swap the slide, fade back in
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => prev + 1);
        setVisible(true);
      }, 300);
    }, 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // AUTO ROUTE AFTER LAST SLIDE
  useEffect(() => {
    if (index === slides.length) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      const timeout = setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [index, navigate]);

  if (index >= slides.length) return null;

  return (
    <div
      className={styles.bg}
      style={{ backgroundImage: `url(${Images.onboardingbg})` }}
    >
      {/* IMAGE */}
      <div
        className={`${styles.imageWrapper} ${visible ? styles.visible : styles.hidden}`}
      >
        <img src={slides[index].image} className={styles.image} alt="" />
      </div>

      {/* TEXT */}
      <p className={`${styles.text} ${visible ? styles.visible : styles.hidden}`}>
        {slides[index].text}
      </p>

      {/* DOTS */}
      <div className={styles.pagination}>
        {slides.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === index ? styles.activeDot : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
