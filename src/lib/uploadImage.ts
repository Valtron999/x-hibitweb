import { supabase } from "./supabase";

/**
 * Uploads a locally-picked image (from an <input type="file"> or a
 * blob:/data: URL) into the "posts" Storage bucket, under a folder named
 * after the user's id — required by the storage RLS policies.
 * Returns the public URL to store on the post row.
 */
export async function uploadPostImage(localUri: string, userId: string): Promise<string> {
  const fileExt = localUri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
  const path = `${userId}/${Date.now()}.${fileExt}`;
  const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

  const response = await fetch(localUri);
  const fileData = await response.blob();

  const { error } = await supabase.storage
    .from("posts")
    .upload(path, fileData, { contentType, upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

function extFromMimeType(mimeType?: string): string {
  if (!mimeType) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  return "jpg"; // covers image/jpeg and anything unrecognized
}

/**
 * Uploads a locally-picked image into the "posts" Storage bucket, using a
 * distinct "avatar-" filename prefix so it's easy to tell apart from post
 * images in the bucket listing.
 *
 * 🔧 If you'd rather keep avatars in their own bucket for organization,
 * create an "avatars" bucket + matching RLS policy in Supabase, then change
 * both `.from("posts")` calls below to `.from("avatars")`.
 */
export async function uploadProfileImage(
  localUri: string,
  userId: string,
  mimeType?: string
): Promise<string> {
  const fileExt = extFromMimeType(mimeType);
  const path = `${userId}/avatar-${Date.now()}.${fileExt}`;
  const contentType = mimeType || (fileExt === "png" ? "image/png" : "image/jpeg");

  const response = await fetch(localUri);
  const fileData = await response.blob();

  const { error } = await supabase.storage
    .from("posts")
    .upload(path, fileData, { contentType, upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}
