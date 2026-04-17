import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration for Supabase Storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'hris-uploads';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ [BOOT] Supabase Storage variables are MISSING (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Uploads will fall back to local folder.");
} else {
  console.log(`✅ [BOOT] Supabase Storage configured. Bucket: ${SUPABASE_BUCKET_NAME}`);
}

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

/**
 * Uploads a local file to Supabase Storage
 * @param localPath Path to the file on disk
 * @param destinationFolder Folder name in the bucket (e.g., 'attendance')
 * @returns Public URL of the uploaded file
 */
export async function uploadToSupabase(localPath: string, destinationFolder: string): Promise<string> {
  const relativePath = path.relative(process.cwd(), localPath).replace(/\\/g, '/');
  const webPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (!supabase) {
    console.warn("Supabase Storage not configured. Falling back to local URL.");
    return webPath;
  }

  try {
    const fileContent = fs.readFileSync(localPath);
    const fileName = path.basename(localPath);
    const bucketName = destinationFolder; // Now use destinationFolder as the bucket name (face_references or attendance)
    const filePath = fileName; // No more folder prefix inside bucket

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: getContentType(fileName)
      });

    if (error) throw error;

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase Upload Error (Falling back to local Mode):", error);
    // If upload fails, return local path as fallback instead of crashing
    return webPath;
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
