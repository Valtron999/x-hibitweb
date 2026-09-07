import { SuggestedPeople } from "@/components/SuggestedPeople";
import Spinner from "@/components/Spinner";
import ToggleSwitch from "@/components/ToggleSwitch";
import { Icons } from "@/constants/icons";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useGoBack } from "@/hooks/useGoBack";
import { useProfileImageUpload } from "@/hooks/useProfileImageUpload";
import { useUserPosts } from "@/hooks/useUserPosts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import type { PostWithAuthor } from "@/lib/mapPost";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./UserProfile.module.css";

/* =========================
   🔥 RESPONSIVE BREAKPOINTS
========================= */
const BREAKPOINTS = {
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
};

function getColumnCount(width: number) {
  if (width >= BREAKPOINTS.desktop) return 4;
  if (width >= BREAKPOINTS.laptop) return 3;
  if (width >= BREAKPOINTS.tablet) return 3;
  return 1;
}

/* =========================
   🔥 LIGHTWEIGHT MASONRY (round-robin, matches original)
========================= */
function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const cols: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => cols[i % columnCount].push(item));
  return cols;
}

// Replaces RN's Animated.interpolate with clamped extrapolation.
function clampInterpolate(value: number, inputRange: [number, number], outputRange: [number, number]) {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

type SettingsRowProps = {
  icon: string;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
};

function SettingsRow({ icon, title, description, value, onPress, right }: SettingsRowProps) {
  return (
    <button className={styles.settingsRow} onClick={onPress} disabled={!onPress && !right}>
      <span className={styles.settingsIconBox}>
        <img src={icon} className={styles.settingsIcon} alt="" />
      </span>
      <span className={styles.settingsRowCopy}>
        <span className={styles.settingsRowTitle}>{title}</span>
        {!!description && <span className={styles.settingsRowDescription}>{description}</span>}
      </span>
      {!!value && <span className={styles.settingsValue}>{value}</span>}
      {right || <span className={styles.settingsArrow}>›</span>}
    </button>
  );
}

function SettingsSection({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className={styles.settingsSection}>
      <p className={styles.settingsEyebrow}>{eyebrow}</p>
      <div className={styles.settingsGroup}>{children}</div>
    </div>
  );
}

function OptionChips({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}) {
  return (
    <div className={styles.optionChips}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={`${styles.optionChip} ${selected === option ? styles.optionChipSelected : ""}`}
        >
          <span className={selected === option ? styles.optionChipTextSelected : styles.optionChipText}>
            {option}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const width = useWindowWidth();
  const goBackFallback = useGoBack("/home");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);

  const isDesktop = width >= BREAKPOINTS.tablet;
  const columnCount = useMemo(() => getColumnCount(width), [width]);

  const openSettings = useCallback(() => {
    setSettingsVisible(true);
    setSettingsClosing(false);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsClosing(true);
    setTimeout(() => {
      setSettingsVisible(false);
      setSettingsClosing(false);
    }, 220);
  }, []);

  /* =========================
     🔥 WHO IS LOGGED IN, WHO IS BEING VIEWED
  ========================= */
  const { session, profile: myProfile, loading: authLoading, signOut } = useAuth();

  const [appearance, setAppearance] = useState("Dark");
  const [contentDensity, setContentDensity] = useState("Balanced");
  const [recommendations, setRecommendations] = useState("More personalized");
  const [privacyMode, setPrivacyMode] = useState("Public");
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    followers: true,
    messages: false,
  });
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const viewingOwnProfile = !paramId || (!!myProfile && String(paramId) === String(myProfile.id));

  const {
    profile: otherProfile,
    loading: otherLoading,
    error: otherError,
  } = useUserProfile(viewingOwnProfile ? undefined : paramId);

  const user = viewingOwnProfile ? myProfile : otherProfile;
  const loading = authLoading || (!viewingOwnProfile && otherLoading);

  const isOwner = viewingOwnProfile && !!session;

  /* =========================
     🔥 REAL FOLLOW / UNFOLLOW
  ========================= */
  const {
    isFollowing,
    checking: followChecking,
    updating: followUpdating,
    follow,
    unfollow,
  } = useFollow(myProfile?.id, user?.id, { enabled: !isOwner && !!user });

  /* =========================
     🔥 POSTS
  ========================= */
  const postsEnabled = !loading && !!user?.id;
  // useUserPosts already refetches on its own whenever the target user id
  // changes, which covers navigating between profiles — there's no RN
  // "screen focus" equivalent needed here on web.
  const { posts: userPosts, loading: postsLoading } = useUserPosts(
    postsEnabled ? user!.id : undefined
  );

  /* =========================
     🔥 RANDOM BACKGROUND
  ========================= */
  const randomPost = useMemo(() => {
    if (userPosts.length === 0) return null;
    return userPosts[Math.floor(Math.random() * userPosts.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userPosts.length]);

  /* =========================
     🔥 SCROLL PARALLAX (replaces Animated + interpolate)
  ========================= */
  const [scrollY, setScrollY] = useState(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  }, []);

  const headerTranslate = clampInterpolate(scrollY, [0, 150], [0, -120]);
  const headerOpacity = clampInterpolate(scrollY, [0, 120], [1, 0]);

  /* =========================
     🔥 COUNT ANIMATION
  ========================= */
  const [followers, setFollowers] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    if (!user) return;

    let f = 0;
    let p = 0;
    let fg = 0;

    const interval = setInterval(() => {
      if (f < user.followersCount) f += Math.ceil(user.followersCount / 30) || 1;
      if (p < userPosts.length) p += Math.ceil(userPosts.length / 30) || 1;
      if (fg < user.followingCount) fg += Math.ceil(user.followingCount / 30) || 1;

      setFollowers(Math.min(f, user.followersCount));
      setPostsCount(Math.min(p, userPosts.length));
      setFollowing(Math.min(fg, user.followingCount));
    }, 30);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userPosts.length]);

  const handleFollowPress = useCallback(async () => {
    if (!session) {
      navigate("/auth/login");
      return;
    }
    if (followUpdating || followChecking) return;

    if (isFollowing) {
      setFollowers((f) => Math.max(f - 1, 0));
      const ok = await unfollow();
      if (!ok) setFollowers((f) => f + 1);
    } else {
      setFollowers((f) => f + 1);
      const ok = await follow();
      if (!ok) setFollowers((f) => Math.max(f - 1, 0));
    }
  }, [session, isFollowing, followUpdating, followChecking, follow, unfollow, navigate]);

  const handleAddPostPress = useCallback(() => {
    if (!session) {
      navigate("/auth/login");
      return;
    }
    navigate("/create-post");
  }, [session, navigate]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setLogoutError("");
    const { error } = await signOut();
    if (error) {
      setLogoutError(error.message);
      setLoggingOut(false);
      return;
    }
    setLogoutVisible(false);
    closeSettings();
    navigate("/", { replace: true });
  }, [signOut, closeSettings, navigate]);

  const goBack = useCallback(() => goBackFallback(), [goBackFallback]);

  const goToPost = useCallback((postId: string) => navigate(`/post/${postId}`), [navigate]);

  const postColumns = useMemo(() => distributeToColumns(userPosts, columnCount), [userPosts, columnCount]);

  /* =========================
     🔥 EDIT PROFILE PICTURE
     Simplified vs. the RN version's camera/gallery action sheet — on web
     the native <input type="file"> picker already covers both (and on
     mobile browsers, exposes a camera option itself), so it's a single
     click straight to the file picker instead of a sheet with two options.
  ========================= */
  const [hoveringAvatar, setHoveringAvatar] = useState(false);
  const [localProfilePicture, setLocalProfilePicture] = useState<string | undefined>(
    user?.profilePicture || undefined
  );

  useEffect(() => {
    setLocalProfilePicture(user?.profilePicture || undefined);
  }, [user?.profilePicture]);

  const { uploading, pickAndUpload } = useProfileImageUpload({
    userId: myProfile?.id,
    onUploaded: (url) => setLocalProfilePicture(url),
  });

  const handleAvatarClick = useCallback(() => {
    if (!isOwner) return;
    fileInputRef.current?.click();
  }, [isOwner]);

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    pickAndUpload(file);
    e.target.value = ""; // allow re-selecting the same file later
  };

  if (loading) {
    return (
      <div className={styles.centerScreen}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <p className={styles.notFoundText}>{otherError || "No user found"}</p>
      </div>
    );
  }

  const followLabel = followUpdating ? "Loading..." : isFollowing ? "Unfollow" : "Follow";

  const statsBlock = (
    <div className={`${styles.statsRow} ${isDesktop ? styles.statsRowDesktop : ""}`}>
      <div className={styles.stat}>
        <p className={styles.statNumber}>{postsCount}</p>
        <p className={styles.statLabel}>Posts</p>
      </div>
      <div className={styles.stat}>
        <p className={styles.statNumber}>{followers}</p>
        <p className={styles.statLabel}>Followers</p>
      </div>
      <div className={styles.stat}>
        <p className={styles.statNumber}>{following}</p>
        <p className={styles.statLabel}>Following</p>
      </div>
    </div>
  );

  const followButton = !isOwner && (
    <button
      className={`${styles.followBtn} ${isDesktop ? styles.followBtnDesktop : ""} ${
        isFollowing ? styles.followingBtn : ""
      }`}
      onClick={handleFollowPress}
      disabled={followUpdating || followChecking}
    >
      {followUpdating ? <Spinner /> : followLabel}
    </button>
  );

  const avatarBlock = (
    <button
      className={styles.avatarPressable}
      onClick={handleAvatarClick}
      onMouseEnter={() => isOwner && setHoveringAvatar(true)}
      onMouseLeave={() => setHoveringAvatar(false)}
      disabled={!isOwner}
    >
      <img src={localProfilePicture || user.profilePicture || undefined} className={styles.profileImage} alt="" />

      {isOwner && (hoveringAvatar || uploading) && (
        <div className={styles.avatarOverlay}>
          {uploading ? (
            <Spinner />
          ) : (
            <>
              <span className={styles.avatarOverlayGlyph}>✎</span>
              <span className={styles.avatarOverlayText}>Edit Photo</span>
            </>
          )}
        </div>
      )}

      {isOwner && !hoveringAvatar && !uploading && (
        <span className={styles.editProfileButton}>
          <span className={styles.editGlyph}>✎</span>
        </span>
      )}
    </button>
  );

  return (
    <div className={styles.container}>
      <div
        className={styles.backgroundImage}
        style={{ backgroundImage: `url(${randomPost?.image || user.profilePicture || ""})` }}
      />
      <div className={styles.overlay} />

      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.iconButton} onClick={goBack} aria-label="Back">
            <img src={Icons.back} className={styles.icon} alt="" />
          </button>

          {isOwner && (
            <div className={styles.topBarActions}>
              <button className={styles.iconButton} onClick={handleAddPostPress} aria-label="Create post">
                <img src={Icons.add} className={styles.icon} alt="" />
              </button>
              <button className={styles.iconButton} onClick={openSettings} aria-label="Settings">
                <img src={Icons.setting} className={styles.icon} alt="" />
              </button>
            </div>
          )}
        </div>

        <div ref={scrollRef} className={styles.scrollArea} onScroll={handleScroll}>
          <div className={isDesktop ? styles.scrollInnerDesktop : undefined}>
            {/* PROFILE CARD — layout forks here: stacked on mobile, split on desktop */}
            {isDesktop ? (
              <div
                className={styles.desktopCard}
                style={{ transform: `translateY(${headerTranslate}px)`, opacity: headerOpacity }}
              >
                <div className={styles.desktopImageBox}>{avatarBlock}</div>

                <div className={styles.desktopContent}>
                  <p className={styles.nameLeft}>{user.name}</p>
                  <p className={styles.locationLeft}>{user.bio || "Creative Artist"}</p>
                  {statsBlock}
                  {followButton}
                </div>
              </div>
            ) : (
              <div
                className={styles.card}
                style={{ transform: `translateY(${headerTranslate}px)`, opacity: headerOpacity }}
              >
                <div className={styles.profileBox}>{avatarBlock}</div>

                <div className={styles.content}>
                  <p className={styles.name}>{user.name}</p>
                  <p className={styles.location}>{user.bio || "Creative Artist"}</p>
                  {statsBlock}
                </div>

                {followButton}
              </div>
            )}

            {/* DISCOVER PEOPLE — own profile only */}
            {isOwner && myProfile?.id && <SuggestedPeople viewerId={myProfile.id} />}

            {/* POSTS — column count scales with breakpoint */}
            <div className={styles.postsWrapper}>
              <div className={styles.postsContainer}>
                {postsLoading ? (
                  <div className={styles.postsLoading}>
                    <Spinner />
                  </div>
                ) : userPosts.length === 0 ? (
                  isOwner && (
                    <button className={styles.emptyPostTile} onClick={handleAddPostPress}>
                      <img src={Icons.add} className={styles.emptyPostIcon} alt="" />
                      <span className={styles.emptyPostText}>Add your first post</span>
                    </button>
                  )
                ) : (
                  <div className={styles.postsColumns}>
                    {postColumns.map((col, colIndex) => (
                      <div key={colIndex} className={styles.postsColumn}>
                        {col.map((post: PostWithAuthor) => (
                          <button
                            key={post.id}
                            className={styles.postTouchable}
                            onClick={() => goToPost(post.id)}
                          >
                            <img src={post.image} className={styles.postImage} alt="" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SETTINGS DRAWER */}
        {isOwner && settingsVisible && (
          <div
            className={`${styles.modalOverlay} ${settingsClosing ? styles.modalOverlayClosing : ""}`}
            onClick={closeSettings}
          >
            <div
              className={`${styles.modalContainer} ${isDesktop ? styles.modalContainerDesktop : ""} ${
                settingsClosing ? styles.modalContainerClosing : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHandle} />
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>Settings</span>
                <button className={styles.closeButton} onClick={closeSettings} aria-label="Close settings">
                  <img src={Icons.close} className={styles.closeIcon} alt="" />
                </button>
              </div>

              <div className={styles.settingsScrollContent}>
                <div className={styles.identityCard}>
                  <div className={styles.identityAvatar}>
                    {myProfile?.profilePicture ? (
                      <img src={myProfile.profilePicture} className={styles.identityAvatarImage} alt="" />
                    ) : (
                      <span className={styles.identityInitials}>
                        {myProfile?.name
                          ?.split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={styles.identityCopy}>
                    {!!myProfile?.name && <p className={styles.identityName}>{myProfile.name}</p>}
                    {!!myProfile?.username && (
                      <p className={styles.identityUsername}>@{myProfile.username}</p>
                    )}
                    <div className={styles.identityMeta}>
                      {!!myProfile?.category && (
                        <span className={styles.identityMetaText}>{myProfile.category}</span>
                      )}
                      {!!myProfile?.bio && (
                        <span className={styles.identityMetaText}>{myProfile.bio}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.profileLink}
                    onClick={() => myProfile?.id && navigate(`/user/${myProfile.id}`)}
                  >
                    <span className={styles.profileLinkText}>View</span>
                    <span className={styles.profileLinkArrow}>›</span>
                  </button>
                </div>

                <SettingsSection eyebrow="YOUR SPACE">
                  <SettingsRow
                    icon={Icons.setting}
                    title="Profile"
                    description="Shape your creative identity"
                    onPress={() => {
                      closeSettings();
                      if (myProfile?.id) navigate(`/user/${myProfile.id}`);
                    }}
                  />
                  <SettingsRow
                    icon={Icons.share}
                    title="Portfolio"
                    description="Manage your professional showcase"
                    value="Coming soon"
                  />
                  <SettingsRow
                    icon={Icons.heartInactive}
                    title="Saved Content"
                    description="Return to work that inspired you"
                  />
                </SettingsSection>

                <SettingsSection eyebrow="EXPERIENCE">
                  <div className={styles.settingsControlCard}>
                    <div className={styles.controlHeading}>
                      <img src={Icons.setting} className={styles.controlIcon} alt="" />
                      <span className={styles.settingsRowCopy}>
                        <span className={styles.settingsRowTitle}>Appearance</span>
                        <span className={styles.settingsRowDescription}>Set the mood for your studio</span>
                      </span>
                    </div>
                    <OptionChips options={["Light", "Dark", "System"]} selected={appearance} onSelect={setAppearance} />
                  </div>
                  <div className={styles.settingsControlCard}>
                    <div className={styles.controlHeading}>
                      <img src={Icons.search} className={styles.controlIcon} alt="" />
                      <span className={styles.settingsRowCopy}>
                        <span className={styles.settingsRowTitle}>Feed Preferences</span>
                        <span className={styles.settingsRowDescription}>Tune what appears in your feed</span>
                      </span>
                    </div>
                    <OptionChips
                      options={["More personalized", "Balanced", "More diverse"]}
                      selected={recommendations}
                      onSelect={setRecommendations}
                    />
                  </div>
                  <div className={styles.settingsControlCard}>
                    <div className={styles.controlHeading}>
                      <img src={Icons.menu} className={styles.controlIcon} alt="" />
                      <span className={styles.settingsRowCopy}>
                        <span className={styles.settingsRowTitle}>Content Density</span>
                        <span className={styles.settingsRowDescription}>Choose how much work you see at once</span>
                      </span>
                    </div>
                    <OptionChips
                      options={["Comfortable", "Balanced", "Dense"]}
                      selected={contentDensity}
                      onSelect={setContentDensity}
                    />
                  </div>
                </SettingsSection>

                <SettingsSection eyebrow="DISCOVERY">
                  <SettingsRow
                    icon={Icons.search}
                    title="Discovery Interests"
                    description="Choose the creative categories you discover"
                  />
                  <SettingsRow
                    icon={Icons.heartActive}
                    title="Recommendations"
                    description="More personalized, balanced, or diverse"
                    value={recommendations}
                  />
                </SettingsSection>

                <SettingsSection eyebrow="NOTIFICATIONS">
                  <SettingsRow
                    icon={Icons.heartActive}
                    title="Likes"
                    description="When someone likes your work"
                    right={
                      <ToggleSwitch
                        value={notifications.likes}
                        onChange={(value) => setNotifications((current) => ({ ...current, likes: value }))}
                      />
                    }
                  />
                  <SettingsRow
                    icon={Icons.comment}
                    title="Comments"
                    description="When someone responds to your work"
                    right={
                      <ToggleSwitch
                        value={notifications.comments}
                        onChange={(value) => setNotifications((current) => ({ ...current, comments: value }))}
                      />
                    }
                  />
                  <SettingsRow
                    icon={Icons.add}
                    title="New Followers"
                    description="When someone follows your profile"
                    right={
                      <ToggleSwitch
                        value={notifications.followers}
                        onChange={(value) => setNotifications((current) => ({ ...current, followers: value }))}
                      />
                    }
                  />
                  <SettingsRow
                    icon={Icons.share}
                    title="Messages"
                    description="When someone reaches out"
                    right={
                      <ToggleSwitch
                        value={notifications.messages}
                        onChange={(value) => setNotifications((current) => ({ ...current, messages: value }))}
                      />
                    }
                  />
                </SettingsSection>

                <SettingsSection eyebrow="PRIVACY & SAFETY">
                  <div className={styles.settingsControlCard}>
                    <div className={styles.controlHeading}>
                      <img src={Icons.setting} className={styles.controlIcon} alt="" />
                      <span className={styles.settingsRowCopy}>
                        <span className={styles.settingsRowTitle}>Profile Visibility</span>
                        <span className={styles.settingsRowDescription}>Choose who can discover your work</span>
                      </span>
                    </div>
                    <OptionChips options={["Public", "Private"]} selected={privacyMode} onSelect={setPrivacyMode} />
                  </div>
                  <SettingsRow icon={Icons.setting} title="Security" description="Protect your account and access" />
                  <SettingsRow icon={Icons.close} title="Blocked Accounts" description="Manage accounts you have blocked" />
                </SettingsSection>

                <SettingsSection eyebrow="CREATOR">
                  <SettingsRow
                    icon={Icons.add}
                    title="Professional Mode"
                    description="Unlock creator-focused features"
                    value="Preview"
                  />
                  <SettingsRow icon={Icons.search} title="Portfolio Insights" description="See how people interact with your work" />
                  <SettingsRow icon={Icons.share} title="Profile Analytics" description="Understand your creative reach" />
                  <SettingsRow icon={Icons.setting} title="Booking Availability" description="Let people know when you're available" />
                </SettingsSection>

                <SettingsSection eyebrow="ACCOUNT & SUPPORT">
                  <SettingsRow icon={Icons.setting} title="Account Details" description={myProfile?.email} />
                  <SettingsRow icon={Icons.close} title="Help Center" description="Find answers and contact support" />
                  <SettingsRow icon={Icons.share} title="Community Guidelines" description="Build a thoughtful creative community" />
                  <SettingsRow icon={Icons.search} title="About X-HIBIT" description="The home for creative discovery" />
                </SettingsSection>

                <button
                  className={styles.logoutButton}
                  onClick={() => {
                    setLogoutError("");
                    setLogoutVisible(true);
                  }}
                >
                  Log out
                </button>
                <p className={styles.versionText}>X-HIBIT / Creative tools for curious minds</p>
              </div>
            </div>
          </div>
        )}

        {/* LOGOUT CONFIRMATION */}
        {isOwner && logoutVisible && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmCard}>
              <p className={styles.confirmEyebrow}>ACCOUNT ACCESS</p>
              <p className={styles.confirmTitle}>Log out of X-HIBIT?</p>
              <p className={styles.confirmText}>You can sign back in anytime.</p>
              {!!logoutError && <p className={styles.logoutError}>{logoutError}</p>}
              <div className={styles.confirmActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setLogoutVisible(false)}
                  disabled={loggingOut}
                >
                  Cancel
                </button>
                <button className={styles.confirmLogoutButton} onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? <Spinner /> : "Log out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isOwner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChosen}
          />
        )}
      </div>
    </div>
  );
}
