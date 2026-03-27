"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface FileUploadProps {
  onUpload: (url: string) => void;
  bucket?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  hint?: string;
  value?: string;
  onRemove?: () => void;
  disabled?: boolean;
}

export function FileUpload({
  onUpload,
  bucket = "payment-proofs",
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
  maxSize = 5 * 1024 * 1024,
  label = "Upload File",
  hint,
  value,
  onRemove,
  disabled,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", bucket);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const { url } = await res.json();
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [bucket, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || uploading,
  });

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <FileImage className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">File uploaded</p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:underline truncate block"
          >
            View file
          </a>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <p className="text-sm font-medium text-slate-300">{label}</p>}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-slate-700 hover:border-slate-600 bg-slate-800/40",
          (disabled || uploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          ) : (
            <Upload className={cn("h-8 w-8", isDragActive ? "text-emerald-400" : "text-slate-500")} />
          )}
          <div>
            <p className="text-sm text-slate-300">
              {uploading
                ? "Uploading..."
                : isDragActive
                ? "Drop file here"
                : "Drag & drop or click to upload"}
            </p>
            {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
