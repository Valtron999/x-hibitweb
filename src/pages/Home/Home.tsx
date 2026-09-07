import Avatar from "@/components/Avatar";
import CategoryTabs from "@/components/CategoryTabs";
import PostCard from "@/components/PostCard";
import { Icons } from "@/constants/icons";
import { Images } from "@/constants/images";
import { categories } from "@/data/category";
import type { User } from "@/data/type";
import { useAllPosts } from "@/hooks/useAllPosts";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useElementSize } from "@/hooks/useElementSize";
import type { PostWithAuthor } from "@/lib/mapPost";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

// ── Search result types ──────────────────────────────────────────────────
type PostSearchItem = PostWithAuthor & { kind: "post"; searchText: string };
type UserSearchItem = User & { kind: "user"; searchText: string };
type SearchItem = PostSearchItem | UserSearchItem;

// ── Masonry grid tuning ───────────────────────────────────────────────────
// These MUST stay in sync with the margin values used inside PostCard.tsx.
const CARD_MIN_WIDTH = 200; // cards never get narrower than this
const CARD_MAX_WIDTH = 280; // cards never get wider than this
const CARD_GAP = 16; // total horizontal gap "spent" per card
const MIN_COLUMNS = 2;

function computeGrid(containerWidth: number) {
  if (containerWidth <= 0) {
    return { numColumns: MIN_COLUMNS, columnWidth: CARD_MIN_WIDTH };
  }

  let columns = Math.floor(containerWidth / (CARD_MIN_WIDTH + CARD_GAP));
  columns = Math.max(MIN_COLUMNS, columns);

  let columnWidth = containerWidth / columns - CARD_GAP;

  while (columnWidth > CARD_MAX_WIDTH) {
    columns += 1;
    columnWidth = containerWidth / columns - CARD_GAP;
  }

  return { numColumns: columns, columnWidth: Math.max(columnWidth, 80) };
}

// Distributes posts across N columns using a shortest-column-first bin
// pack (estimated by aspect ratio + a fixed height for the text block
// beneath each image) — this is what gives the grid its staggered
// "masonry" look instead of naive round-robin.
const CARD_TEXT_BLOCK_HEIGHT = 54;

function distributeMasonry(posts: PostWithAuthor[], numColumns: number, columnWidth: number) {
  const columns: PostWithAuthor[][] = Array.from({ length: numColumns }, () => []);
  const columnHeights = new Array(numColumns).fill(0);

  for (const post of posts) {
    const ratio = post.aspectRatio && post.aspectRatio > 0 ? post.aspectRatio : 1;
    const estimatedHeight = columnWidth / ratio + CARD_TEXT_BLOCK_HEIGHT;

    let shortest = 0;
    for (let i = 1; i < numColumns; i++) {
      if (columnHeights[i] < columnHeights[shortest]) shortest = i;
    }

    columns[shortest].push(post);
    columnHeights[shortest] += estimatedHeight;
  }

  return columns;
}

// ── Skeleton loading placeholder (replaces spinner) ──────────────────────
function SkeletonGrid({ columns }: { columns: number }) {
  const rows = 4;
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.skeletonRow}>
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className={styles.skeletonBlock}
              style={{ height: 140 + ((r + c) % 3) * 40 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Search result row (user) ─────────────────────────────────────────────
function UserResultRow({ user, onPress }: { user: User; onPress: () => void }) {
  return (
    <button className={styles.userRow} onClick={onPress}>
      <Avatar uri={user.profilePicture} name={user.name} size={44} />
      <div className={styles.userRowText}>
        <p className={styles.userName}>{user.name}</p>
        <p className={styles.userHandle}>@{user.username}</p>
      </div>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [gridRef, { width }] = useElementSize<HTMLDivElement>();

  const { numColumns, columnWidth } = useMemo(() => computeGrid(width), [width]);

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { posts, loading, error, refetch } = useAllPosts();
  // Users are only fetched once the search modal has been opened at least
  // once, so Home doesn't pay for a profiles fetch nobody asked for.
  const { users, loading: usersLoading } = useAllUsers({
    enabled: searchOpen,
    excludeId: profile?.id,
  });

  // Lock body scroll while the search modal is open
  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [searchOpen]);

  // ✅ Category-only filter for the main feed (search no longer touches this)
  const categoryPosts = useMemo(() => {
    if (activeCategory === "all") return posts;
    return posts.filter((post) => post.category === activeCategory);
  }, [posts, activeCategory]);

  const columns = useMemo(
    () => distributeMasonry(categoryPosts, numColumns, columnWidth),
    [categoryPosts, numColumns, columnWidth]
  );

  // ✅ Precomputed lowercase search index — built once per posts/users change,
  // not on every keystroke.
  const postsIndex: PostSearchItem[] = useMemo(
    () =>
      posts.map((post) => ({
        ...post,
        kind: "post",
        searchText: [post.title, post.description, post.category, ...(post.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [posts]
  );

  const usersIndex: UserSearchItem[] = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        kind: "user",
        searchText: [user.name, user.username, user.bio].filter(Boolean).join(" ").toLowerCase(),
      })),
    [users]
  );

  // ✅ Combined search results (users first, then posts)
  const searchResults: SearchItem[] = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];

    const matchedUsers = usersIndex.filter((u) => u.searchText.includes(q));
    const matchedPosts = postsIndex.filter((p) => p.searchText.includes(q));

    return [...matchedUsers, ...matchedPosts];
  }, [debouncedQuery, usersIndex, postsIndex]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchClosing(false);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchClosing(true);
    setTimeout(() => {
      setSearchOpen(false);
      setSearchClosing(false);
      setQuery("");
    }, 200);
  }, []);

  const handleAvatarPress = useCallback(() => {
    if (profile) {
      navigate(`/user/${profile.id}`);
    } else {
      navigate("/auth/login");
    }
  }, [profile, navigate]);

  const handleAddPost = useCallback(() => {
    navigate("/create-post");
  }, [navigate]);

  const goToUser = useCallback((id: string) => navigate(`/user/${id}`), [navigate]);

  const headerElement = (
    <>
      <div className={styles.headerRow}>
        <img src={Images.logo} className={styles.logo} alt="x-hibit" />

        <div className={styles.headerActions}>
          <button className={styles.headerIconButton} onClick={openSearch} aria-label="Search">
            <img src={Icons.search} className={styles.headerIcon} alt="" />
          </button>

          <button className={styles.avatarButton} onClick={handleAvatarPress} aria-label="Profile">
            <Avatar uri={profile?.profilePicture} name={profile?.name} size={35} />
          </button>
        </div>
      </div>

      <CategoryTabs data={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
    </>
  );

  // ── Loading state (skeleton instead of spinner) ─────────────────────────
  if (loading && posts.length === 0) {
    return (
      <div className={styles.screen}>
        {headerElement}
        <SkeletonGrid columns={numColumns} />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error && posts.length === 0) {
    return (
      <div className={styles.screen}>
        {headerElement}
        <div className={styles.centerBox}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={refetch}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {headerElement}

      <div ref={gridRef} className={styles.masonryContainer}>
        {categoryPosts.length === 0 ? (
          <div className={styles.emptyBox}>
            <p className={styles.emptyText}>No posts found.</p>
          </div>
        ) : (
          columns.map((column, i) => (
            <div key={i} className={styles.masonryColumn}>
              {column.map((post) => (
                <PostCard key={post.id} post={post} cardWidth={columnWidth} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* FLOATING ADD POST BUTTON */}
      <button className={styles.fab} onClick={handleAddPost} aria-label="Create post">
        <span className={styles.fabIconText}>+</span>
      </button>

      {/* SEARCH MODAL */}
      {searchOpen && (
        <div className={`${styles.searchModal} ${searchClosing ? styles.searchModalClosing : ""}`}>
          <div className={styles.searchHeader}>
            <button className={styles.closeButton} onClick={closeSearch} aria-label="Close search">
              <img src={Icons.close} className={styles.closeIcon} alt="" />
            </button>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts and people..."
              autoFocus
              className={styles.searchInput}
            />
          </div>

          <div className={styles.searchResults}>
            {searchResults.length === 0 && query.trim() && (
              <div className={styles.emptyBox}>
                <p className={styles.emptyText}>
                  {usersLoading ? "Searching..." : "No results found."}
                </p>
              </div>
            )}

            {searchResults.map((item) =>
              item.kind === "user" ? (
                <UserResultRow key={`user-${item.id}`} user={item} onPress={() => goToUser(item.id)} />
              ) : (
                <div key={`post-${item.id}`} className={styles.postResultRow}>
                  <PostCard post={item} cardWidth={Math.min(width - 40, 500)} />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
