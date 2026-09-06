import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { uploadProfileImage } from "../lib/uploadImage";

interface UseProfileImageUploadOptions {
  userId: string | undefined;
  onUploaded?: (url: string) => void;
}

export function useProfileImageUpload({ userId, onUploaded }: UseProfileImageUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Takes a File straight from an <input type="file" accept="image/*" />
  // onChange handler (there's no camera-vs-gallery distinction on web the
  // way there was with expo-image-picker; the browser's own file picker
  // already lets the user choose "take photo" on mobile via capture attr).
  const pickAndUpload = useCallback(
    async (file: File | null | undefined) => {
      if (!userId || !file) return;

      const objectUrl = URL.createObjectURL(file);
      setUploading(true);
      setError(null);

      try {
        const publicUrl = await uploadProfileImage(objectUrl, userId, file.type || undefined);

        // profiles table uses snake_case: profile_picture
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ profile_picture: publicUrl })
          .eq("id", userId);

        if (updateError) throw updateError;

        onUploaded?.(publicUrl);
      } catch (err: any) {
        console.error("Profile picture upload failed:", err);
        setError(err?.message ?? "Upload failed");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setUploading(false);
      }
    },
    [userId, onUploaded]
  );

  return { uploading, error, pickAndUpload };
}
