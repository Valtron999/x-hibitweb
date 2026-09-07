import styles from "./Avatar.module.css";

function getInitials(name?: string) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export default function Avatar({
  uri,
  name,
  size,
}: {
  uri?: string;
  name?: string;
  size: number;
}) {
  if (uri) {
    return (
      <img
        src={uri}
        alt={name ?? ""}
        className={styles.avatar}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <div
      className={styles.fallback}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <span style={{ fontSize: size / 2.2 }}>{getInitials(name)}</span>
    </div>
  );
}
