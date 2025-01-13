// components/FilePreview.tsx
import React from "react";

interface FilePreviewProps {
  fileName: string;
  previewUrl?: string;
  onRemove: () => void;
}

export function FilePreview({ fileName, previewUrl, onRemove }: FilePreviewProps) {
  return (
    <div className="mb-2">
      {previewUrl ? (
        <div className="relative w-24 h-24">
          <img
            src={previewUrl}
            alt="Preview"
            className="object-cover w-full h-full rounded"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 hover:bg-gray-200"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded w-fit">
          <span className="text-sm">{fileName}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-500 hover:text-red-500"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}