import type { PostWithAuthor } from "@/lib/mapPost";
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PostCard.module.css";

type Props = {
  post: PostWithAuthor;
  cardWidth?: number; // width of the column this card is rendered in
};

const FALLBACK_WIDTH = typeof window !== "undefined" ? window.innerWidth / 2 - 12 : 160;

// Must match CARD_GAP in Home.tsx (split evenly left/right = CARD_GAP / 2
// each), and CARD_GAP / 2 again for the bottom gap between rows.
const CARD_MARGIN_HORIZONTAL = 8;
const CARD_MARGIN_BOTTOM = 16;

function PostCard({ post, cardWidth }: Props) {
  const navigate = useNavigate();

  const width = cardWidth ?? FALLBACK_WIDTH;

  // aspectRatio = width / height. Guard so we never divide by 0/undefined.
  const ratio = post.aspectRatio && post.aspectRatio > 0 ? post.aspectRatio : 1;
  const imageHeight = width / ratio;

  return (
    <button
      className={styles.card}
      onClick={() => navigate(`/post/${post.id}`)}
      style={{
        width,
        marginLeft: CARD_MARGIN_HORIZONTAL,
        marginRight: CARD_MARGIN_HORIZONTAL,
        marginBottom: CARD_MARGIN_BOTTOM,
      }}
    >
      {/* Image — no radius here, the card container clips it */}
      <img src={post.image} className={styles.image} style={{ width, height: imageHeight }} alt="" />

      {/* Info — padded inside the same card surface as the image */}
      <div className={styles.info}>
        <p className={styles.author}>{post.authorUsername || "Unknown"}</p>
        <p className={styles.description}>{post.description}</p>
      </div>
    </button>
  );
}

// Skips re-rendering a card when neither its post data nor its width
// changed — this is the single biggest win from the perf list, since
// without it every keystroke/re-render re-renders every visible card.
function arePropsEqual(prev: Props, next: Props) {
  return (
    prev.cardWidth === next.cardWidth &&
    prev.post.id === next.post.id &&
    prev.post.likes === next.post.likes &&
    prev.post.commentsCount === next.post.commentsCount &&
    prev.post.image === next.post.image &&
    prev.post.description === next.post.description &&
    prev.post.authorUsername === next.post.authorUsername
  );
}

export default memo(PostCard, arePropsEqual);
