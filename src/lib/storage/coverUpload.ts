import { supabase } from '@/integrations/supabase/client';

/**
 * Upload cover image to post-covers bucket
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @param postId - The post's ID
 * @returns Public URL of the uploaded image
 */
export async function uploadCoverImage(
  file: File,
  userId: string,
  postId: string
): Promise<string> {
  const extension = file.type.includes('png') ? 'png' : 'jpg';
  const fileName = `${userId}/${postId}/cover.${extension}`;
  
  const { error: uploadError } = await supabase.storage
    .from('post-covers')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true
    });
  
  if (uploadError) {
    console.error('[CoverUpload] Error uploading:', uploadError);
    throw uploadError;
  }
  
  const { data } = supabase.storage
    .from('post-covers')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
}

/**
 * Delete cover image from storage
 * @param userId - The user's ID
 * @param postId - The post's ID
 */
export async function deleteCoverImage(
  userId: string,
  postId: string
): Promise<void> {
  const { error } = await supabase.storage
    .from('post-covers')
    .remove([`${userId}/${postId}/cover.jpg`, `${userId}/${postId}/cover.png`]);
  
  if (error) {
    console.error('[CoverUpload] Error deleting:', error);
    // Don't throw - deletion failures are not critical
  }
}
