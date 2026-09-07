import styles from "./ToggleSwitch.module.css";

export default function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      className={styles.track}
      style={{ backgroundColor: value ? "#7E252A" : "#34343A" }}
      onClick={() => onChange(!value)}
    >
      <span
        className={styles.thumb}
        style={{
          backgroundColor: value ? "#ED3237" : "#8A8A92",
          transform: value ? "translateX(18px)" : "translateX(0)",
        }}
      />
    </button>
  );
}
