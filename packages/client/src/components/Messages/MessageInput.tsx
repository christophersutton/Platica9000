// components/MessageInput.tsx
import React, { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useSupabase } from "../../hooks/use-supabase";
import { useFileUpload, type Attachment } from "../../hooks/use-upload";
import { FilePreview } from "./FilePreview";
import { AttachmentList } from "./AttachmentList";
import { Progress } from "../../components/ui/progress";

interface MessageInputProps {
  channelId: string;
  onSend: (content: string, attachments?: Attachment[]) => Promise<void>;
}

export default function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [filePreview, setFilePreview] = useState<{
    file: File;
    previewUrl?: string;
    index: number;
  } | null>(null);

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const { supabase } = useSupabase();
  const { uploading, progress, uploadFile } = useFileUpload(supabase);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const attachment = await uploadFile(file);
    if (attachment) {
      const newIndex = pendingAttachments.length;
      setPendingAttachments((prev) => [...prev, attachment]);
      
      if (file.type.startsWith("image/")) {
        setFilePreview({ 
          file, 
          previewUrl: URL.createObjectURL(file),
          index: newIndex
        });
      }
    }
  };

  // Revoke object URLs when unmounting
  useEffect(() => {
    return () => {
      if (filePreview?.previewUrl) {
        URL.revokeObjectURL(filePreview.previewUrl);
      }
    };
  }, [filePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && pendingAttachments.length === 0) return;
    if (uploading) return;

    await onSend(message, pendingAttachments);
    setMessage("");
    setPendingAttachments([]);
    setFilePreview(null);
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
    setFilePreview(null);
    URL.revokeObjectURL(filePreview?.previewUrl || "");
    return 
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {filePreview?.previewUrl && (
        <FilePreview
          fileName={filePreview.file.name}
          previewUrl={filePreview.previewUrl}
          onRemove={() => handleRemoveAttachment(filePreview.index)}
        />
      )}

      <AttachmentList
        attachments={pendingAttachments}
        onRemove={handleRemoveAttachment}
      />

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between mb-2 text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full h-2" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
          disabled={false}
        />

        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          disabled={uploading}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-2 rounded ${uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}
        >
          <Upload className="w-5 h-5" />
        </button>

        <button
          type="submit"
          disabled={uploading || (!message.trim() && pendingAttachments.length === 0)}
          className={`p-2 rounded bg-blue-500 text-white 
            ${uploading || (!message.trim() && pendingAttachments.length === 0)
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-600"}`}
        >
          Send
        </button>
      </div>
    </form>
  );
}