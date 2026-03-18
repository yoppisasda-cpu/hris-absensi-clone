import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration for Supabase Storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'hris-uploads';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * Uploads a local file to Supabase Storage
 * @param localPath Path to the file on disk
 * @param destinationFolder Folder name in the bucket (e.g., 'attendance')
 * @returns Public URL of the uploaded file
 */
export async function uploadToSupabase(localPath: string, destinationFolder: string): Promise<string> {
  if (!supabase) {
    console.warn("Supabase Storage not configured. Falling back to local URL.");
    return `/${localPath.replace(/\\/g, '/')}`;
  }

  try {
    const fileContent = fs.readFileSync(localPath);
    const fileName = path.basename(localPath);
    const filePath = `${destinationFolder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(filePath, fileContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: getContentType(fileName)
      });

    if (error) throw error;

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase Upload Error:", error);
    throw error;
  }
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
