import React, { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";

import { Attachment } from "./Messages";

type FilePreview = {
  file: File;
  previewUrl?: string;
};

const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_');
};

interface MessageInputProps {
  channelId: string;
  onSend: (content: string, attachments?: Attachment[]) => Promise<void>;
}

export default function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const { supabase } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview({ file, previewUrl });
    } else {
      setFilePreview({ file });
    }

    setUploading(true);
    try {
      const timestamp = new Date().getTime();
      const sanitizedName = `${timestamp}-${sanitizeFileName(file.name)}`;
      console.log('Attempting to upload:', {
        bucket: 'attachments',
        path: `/private/${sanitizedName}`,
        fileSize: file.size,
        fileType: file.type
      });

      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(`/private/${sanitizedName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);
      
      const { data: signedUrlData } = await supabase.storage
        .from("attachments")
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);
        
      if (!signedUrlData) throw new Error("Failed to get signed URL");
        
      setPendingAttachments(prev => [...prev, {
        type: "file",
        url: signedUrlData.signedUrl,
        name: file.name,
      }]);

    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (filePreview?.previewUrl) {
        URL.revokeObjectURL(filePreview.previewUrl);
      }
    };
  }, [filePreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && pendingAttachments.length === 0) return;
    if (uploading) return;

    await onSend(message, pendingAttachments);
    setMessage("");
    setPendingAttachments([]);
    setFilePreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {filePreview && (
        <div className="mb-2">
          {filePreview.previewUrl ? (
            <div className="relative w-24 h-24">
              <img 
                src={filePreview.previewUrl} 
                alt="Preview" 
                className="object-cover w-full h-full rounded"
              />
              <button
                type="button"
                onClick={() => setFilePreview(null)}
                className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded w-fit">
              <span className="text-sm">{filePreview.file.name}</span>
              <button
                type="button"
                onClick={() => setFilePreview(null)}
                className="text-gray-500 hover:text-red-500"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex gap-2 mb-2">
          {pendingAttachments.map((file, index) => (
            <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              <span className="text-sm truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== index))}
                className="text-gray-500 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
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
          onChange={handleFileUpload}
          className="hidden"
          ref={fileInputRef}
          disabled={uploading}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-2 rounded ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
        >
          <Upload className="w-5 h-5" />
        </button>

        <button
          type="submit"
          disabled={uploading || (!message.trim() && pendingAttachments.length === 0)}
          className={`p-2 rounded bg-blue-500 text-white 
            ${(uploading || (!message.trim() && pendingAttachments.length === 0)) 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'}`}
        >
          Send
        </button>
      </div>
    </form>
  );
}
