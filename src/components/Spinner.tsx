import styles from "./Spinner.module.css";

export default function Spinner({ color = "#FEFEFE", size = 20 }: { color?: string; size?: number }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderTopColor: color, borderRightColor: color }}
    />
  );
}
