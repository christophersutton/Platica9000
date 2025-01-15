// hooks/use-upload.ts
import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeFileName } from "../lib/utils";
// Unified Attachment type imported from the Messages/types file
import type { Attachment } from "../components/Messages/types";

export type { Attachment } from "../components/Messages/types";

interface UseFileUploadResult {
  uploading: boolean;
  progress: number;
  uploadFile: (file: File) => Promise<Attachment | null>;
}

export function useFileUpload(supabase: SupabaseClient): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    setUploading(true);
    setProgress(0);
    try {
      const timestamp = new Date().getTime();
      const sanitizedName = `${timestamp}-${sanitizeFileName(file.name)}`;

      // For now, let's use a simpler approach with XMLHttpRequest for progress
      const { data, error } = await new Promise<{ data: any; error: any }>((resolve) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progressPercent = Math.round((event.loaded / event.total) * 100);
            setProgress(progressPercent);
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve({ data: response, error: null });
          } else {
            resolve({ data: null, error: new Error('Upload failed') });
          }
        };

        xhr.onerror = () => {
          resolve({ data: null, error: new Error('Upload failed') });
        };

        // Get the presigned URL from Supabase
        supabase.storage
          .from("attachments")
          .createSignedUploadUrl(`private/${sanitizedName}`)
          .then(({ data }) => {
            if (!data) {
              resolve({ data: null, error: new Error('Failed to get upload URL') });
              return;
            }
            xhr.open('PUT', data.signedUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
          })
          .catch((error) => {
            resolve({ data: null, error });
          });
      });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      const { data: signedUrlData } = await supabase.storage
        .from("attachments")
        .createSignedUrl(`private/${sanitizedName}`, 60 * 60 * 24 * 365);

      if (!signedUrlData) {
        throw new Error("Failed to get signed URL");
      }

      setProgress(100);

      return {
        type: "file",
        url: signedUrlData.signedUrl,
        name: file.name,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, progress, uploadFile };
}