"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/utils/cn";

interface MultiImageUploadProps {
  value: string[];              // current uploaded URLs
  onChange: (urls: string[]) => void;
  bucket?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
}

interface UploadItem {
  id: string;          // temporary client-side ID
  file?: File;         // pending file (not yet uploaded)
  previewUrl?: string; // object URL for local preview
  uploadedUrl?: string;// final Supabase URL
  error?: string;
  uploading?: boolean;
}

/** Compress an image file to target quality before upload */
async function compressImage(file: File, maxWidthPx = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality);
    };
    img.src = url;
  });
}

async function uploadOne(file: File, bucket: string): Promise<string> {
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("file", new File([compressed], file.name, { type: "image/jpeg" }));
  formData.append("bucket", bucket);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  const json = await res.json();
  return json.url as string;
}

export function MultiImageUpload({
  value = [],
  onChange,
  bucket = "hostel-images",
  maxFiles = 6,
  maxSizeMB = 8,
  label = "Hostel Photos",
  disabled = false,
}: MultiImageUploadProps) {
  // We manage a local list of items that merges already-uploaded URLs
  // with in-progress uploads
  const [items, setItems] = useState<UploadItem[]>(() =>
    value.map((url, i) => ({ id: `existing-${i}`, uploadedUrl: url }))
  );

  const totalCount = items.length;
  const canAddMore  = totalCount < maxFiles;

  // ── Upload a set of new files in parallel ──────────────────────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const slots = Math.min(acceptedFiles.length, maxFiles - totalCount);
      if (slots <= 0) return;

      const newItems: UploadItem[] = acceptedFiles.slice(0, slots).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: true,
      }));

      setItems((prev) => [...prev, ...newItems]);

      // Upload all in parallel
      await Promise.all(
        newItems.map(async (item) => {
          try {
            const url = await uploadOne(item.file!, bucket);
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, uploadedUrl: url, uploading: false, previewUrl: url }
                  : p
              )
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed";
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, uploading: false, error: msg } : p
              )
            );
          }
        })
      );

      // Push all successful URLs up to parent
      setItems((prev) => {
        const urls = prev
          .filter((p) => p.uploadedUrl)
          .map((p) => p.uploadedUrl!);
        onChange(urls);
        return prev;
      });
    },
    [bucket, maxFiles, onChange, totalCount]
  );

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      onChange(next.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!));
      return next;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true,
    disabled: disabled || !canAddMore,
  });

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <span className="text-xs text-slate-500">
            {items.length} / {maxFiles} photos
          </span>
        </div>
      )}

      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, idx) => (
            <div key={item.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-800 group">
              {(item.previewUrl || item.uploadedUrl) && (
                <Image
                  src={item.previewUrl ?? item.uploadedUrl!}
                  alt={`Photo ${idx + 1}`}
                  fill
                  className={cn(
                    "object-cover transition-opacity",
                    item.uploading ? "opacity-50" : "opacity-100"
                  )}
                  sizes="180px"
                  unoptimized={!!item.previewUrl && item.previewUrl.startsWith("blob:")}
                />
              )}

              {/* Uploading overlay */}
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}

              {/* Error overlay */}
              {item.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 p-1">
                  <AlertCircle className="h-4 w-4 text-red-300 mb-1" />
                  <p className="text-xs text-red-200 text-center leading-tight">
                    {item.error}
                  </p>
                </div>
              )}

              {/* First photo label */}
              {idx === 0 && !item.uploading && !item.error && (
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs bg-black/50 text-white">
                  Cover
                </div>
              )}

              {/* Remove button */}
              {!item.uploading && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone (shown while under max) */}
      {canAddMore && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
            isDragActive
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-slate-700 hover:border-slate-500 bg-slate-800/30",
            (!canAddMore || disabled) && "opacity-40 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <ImagePlus
            className={cn(
              "h-7 w-7 mx-auto mb-2",
              isDragActive ? "text-emerald-400" : "text-slate-500"
            )}
          />
          <p className="text-sm text-slate-300">
            {isDragActive
              ? "Drop photos here"
              : `Add photos (up to ${maxFiles - items.length} more)`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            JPG, PNG, WEBP · Max {maxSizeMB}MB each · Auto-compressed before upload
          </p>
        </div>
      )}
    </div>
  );
}
