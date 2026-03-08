import { useRef, useState } from "react";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * ImageUploadPreview — drag-and-drop / click-to-browse image picker with thumbnails.
 *
 * Props:
 *   images         — Array<File> controlled by parent
 *   onImagesChange — (newFiles: File[]) => void
 *   maxImages      — max number of images (default: 5)
 *   minImages      — minimum needed before "ready" indicator (default: 3)
 */
export default function ImageUploadPreview({
  images,
  onImagesChange,
  maxImages = 5,
  minImages = 3,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) =>
      ["image/jpeg", "image/jpg", "image/png"].includes(f.type),
    );
    const merged = [...images, ...incoming].slice(0, maxImages);
    onImagesChange(merged);
  }

  function removeImage(index) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  const remaining = maxImages - images.length;
  const hasOversized = images.some((f) => f.size > 5 * 1024 * 1024);

  return (
    <div className="space-y-3">
      {/* Drop zone — only shown when there's room for more images */}
      {remaining > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition select-none ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/40"
          }`}
        >
          <svg
            className="w-8 h-8 text-gray-400 mx-auto mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-gray-600">
            Drop images here or <span className="text-blue-600">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG · {remaining} slot{remaining !== 1 ? "s" : ""} remaining ·
            Max 5 MB each
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {images.map((file, i) => {
            const url = URL.createObjectURL(file);
            const oversized = file.size > 5 * 1024 * 1024;
            return (
              <div
                key={`${file.name}-${i}`}
                className={`relative group rounded-lg overflow-hidden border ${
                  oversized ? "border-red-400" : "border-gray-200"
                }`}
              >
                <img
                  src={url}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-20 object-cover"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div
                  className={`text-center text-xs py-0.5 truncate px-1 ${
                    oversized
                      ? "bg-red-50 text-red-500"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {oversized ? "Too large" : formatBytes(file.size)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status line */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-0.5">
        <span>
          {images.length} / {maxImages} selected
          {images.length > 0 && images.length < minImages && (
            <span className="text-amber-500 ml-2">
              · {minImages - images.length} more required
            </span>
          )}
        </span>
        {images.length >= minImages && !hasOversized && (
          <span className="text-green-600 font-semibold">
            ✓ Ready to enroll
          </span>
        )}
        {hasOversized && (
          <span className="text-red-500 font-semibold">
            Remove oversized images
          </span>
        )}
      </div>
    </div>
  );
}
