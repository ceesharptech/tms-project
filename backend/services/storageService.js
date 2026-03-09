const supabase = require("./supabase");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

/**
 * Upload a profile picture buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 *
 * @param {string} driverId  - UUID of the driver (used in filename)
 * @param {Buffer} buffer    - File buffer from multer memoryStorage
 * @param {string} mimetype  - e.g. "image/jpeg"
 * @returns {Promise<string>} publicUrl
 */
async function uploadProfilePicture(driverId, buffer, mimetype) {
  if (!BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKET environment variable is not set");
  }

  const ext = mimetype === "image/png" ? "png" : "jpg";
  const filename = `profile_${driverId}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    console.log("[storageService] uploadProfilePicture error:", error);
  }

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Delete a profile picture from Supabase Storage by its public URL.
 * Silently ignores errors (e.g. file already deleted).
 *
 * @param {string} publicUrl - The stored profile_picture_url value
 */
async function deleteProfilePicture(publicUrl) {
  if (!publicUrl || !BUCKET) return;

  try {
    // Extract the filename from the public URL.
    // Public URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filename>
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return;
    const filename = url.pathname.slice(prefix.length);

    await supabase.storage.from(BUCKET).remove([filename]);
  } catch {
    // Non-fatal — log but don't crash the request
    console.warn(
      "[storageService] deleteProfilePicture failed silently:",
      publicUrl,
    );
  }
}

module.exports = { uploadProfilePicture, deleteProfilePicture };
