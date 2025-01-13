// components/AttachmentList.tsx
import React from "react";
import { Attachment } from "../../hooks/use-upload";
import { ExternalLink } from "lucide-react";

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 mb-2">
      {attachments.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
        >
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>{file.name}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-gray-500 hover:text-red-500 ml-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}