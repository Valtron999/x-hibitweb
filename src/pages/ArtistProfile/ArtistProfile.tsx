import { Icons } from "@/constants/icons";
import { postsData } from "@/data/posts";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "@/components/Spinner";
import styles from "./ArtistProfile.module.css";

export default function ArtistProfile() {
  const navigate = useNavigate();
  const { profile: currentUser, session, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  // Once auth has finished loading, bounce anyone without a session back to login
  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth/login", { replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || !currentUser) {
    return (
      <div className={styles.loadingScreen}>
        <Spinner color="#fff" size={28} />
      </div>
    );
  }

  // 🔧 Still pulling from mock data for now, filtered by the real logged-in
  // user's id — this will read as empty until the real posts table exists,
  // since mock ids ("u1") won't match a real Supabase UUID. Swap in
  // useUserPosts(currentUser.id) once that's ready.
  const userPosts = postsData.filter((post) => post.userId === currentUser.id);

  // 🔧 Same caveat, plus currentUser.savedPosts is currently always []
  // until the saved_posts table is built.
  const savedPosts = postsData.filter((post) => currentUser.savedPosts?.includes(post.id));

  const displayPosts = activeTab === "posts" ? userPosts : savedPosts;

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className={styles.page}>
      {/* profile heading */}
      <div className={styles.header}>
        <button className={styles.iconButton} onClick={() => navigate(-1)} aria-label="Back">
          <img src={Icons.back} className={styles.headerIcon} alt="" />
        </button>

        <span className={styles.headerTitle}>{currentUser.name}</span>

        <button className={styles.iconButton} aria-label="Settings">
          <img src={Icons.setting} className={styles.headerIcon} alt="" />
        </button>
      </div>

      {/* profile info */}
      <div>
        <div className={styles.avatarCircle}>
          {currentUser.profilePicture ? (
            <img src={currentUser.profilePicture} className={styles.avatarImage} alt="" />
          ) : (
            <span className={styles.avatarInitials}>{initials}</span>
          )}
        </div>

        <p className={styles.username}>@{currentUser.username}</p>

        <p className={styles.bio}>{currentUser.bio || "No bio yet"}</p>

        <div className={styles.statsRow}>
          <div>
            <p className={styles.statNumber}>{currentUser.followingCount}</p>
            <p className={styles.statLabel}>following</p>
          </div>

          <div>
            <p className={styles.statNumber}>{currentUser.followersCount}</p>
            <p className={styles.statLabel}>followers</p>
          </div>

          <div>
            <p className={styles.statNumber}>{userPosts.length}</p>
            <p className={styles.statLabel}>posts</p>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className={styles.tabsRow}>
        <button className={styles.tabButton} onClick={() => setActiveTab("posts")}>
          <span className={activeTab === "posts" ? styles.tabTextActive : styles.tabText}>Posts</span>
        </button>

        <button className={styles.tabButton} onClick={() => setActiveTab("saved")}>
          <span className={activeTab === "saved" ? styles.tabTextActive : styles.tabText}>Saved</span>
        </button>
      </div>

      {/* posts grid */}
      <div className={styles.grid}>
        {displayPosts.length > 0 ? (
          displayPosts.map((post) => (
            <button
              key={post.id}
              className={styles.gridCell}
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <img src={post.image} className={styles.gridImage} alt="" />
            </button>
          ))
        ) : (
          <div className={styles.emptyBox}>
            <p className={styles.emptyText}>
              {activeTab === "posts" ? "No posts yet" : "No saved posts"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
