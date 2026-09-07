import { useFollow } from "@/hooks/useFollow";
import { type SuggestedUser, useSuggestedUsers } from "@/hooks/useSuggestedUsers";
import { useNavigate } from "react-router-dom";
import Spinner from "./Spinner";
import styles from "./SuggestedPeople.module.css";

function SuggestedUserCard({
  user,
  viewerId,
  onDismiss,
}: {
  user: SuggestedUser;
  viewerId: string;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { isFollowing, updating, follow } = useFollow(viewerId, user.id, { enabled: true });

  return (
    <div className={styles.card}>
      <button
        className={styles.dismissBtn}
        onClick={() => onDismiss(user.id)}
        aria-label="Dismiss suggestion"
      >
        ✕
      </button>

      <button className={styles.avatarButton} onClick={() => navigate(`/user/${user.id}`)}>
        <img src={user.profilePicture || undefined} className={styles.avatar} alt="" />
      </button>

      <p className={styles.name}>{user.name}</p>
      <p className={styles.subtitle}>
        {user.mutualsCount > 0 ? `${user.mutualsCount} mutuals` : "Suggested for you"}
      </p>

      <button
        className={`${styles.followBtn} ${isFollowing ? styles.followingBtn : ""}`}
        onClick={follow}
        disabled={updating || isFollowing}
      >
        {updating ? <Spinner size={16} /> : isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}

export function SuggestedPeople({ viewerId }: { viewerId: string }) {
  const { users, loading, dismiss } = useSuggestedUsers(viewerId);

  if (!loading && users.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>Discover people</span>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>
          <Spinner size={24} />
        </div>
      ) : (
        <div className={styles.scrollRow}>
          {users.map((user) => (
            <SuggestedUserCard key={user.id} user={user} viewerId={viewerId} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </div>
  );
}
