import { supabase } from '../supabaseClient';

const sanitizeFileName = (value) =>
  value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

export const uploadHrAsset = async ({
  bucket,
  file,
  teacherId,
  hrProfileId,
  docType,
  customName
}) => {
  if (!file) {
    throw new Error('No file selected.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = sanitizeFileName(customName || `${Date.now()}-${file.name}`);
  const filePath = `teacher-${teacherId}/profile-${hrProfileId}/${docType}/${fileName}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    filePath,
    fileUrl: data.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || null
  };
};

export const uploadHrBlob = async ({
  bucket,
  blob,
  fileName,
  teacherId,
  hrProfileId,
  fileType
}) => {
  const cleanName = sanitizeFileName(fileName);
  const filePath = `teacher-${teacherId}/profile-${hrProfileId}/${fileType}/${cleanName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, { contentType: 'application/pdf', upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    filePath,
    fileUrl: data.publicUrl,
    fileName,
    fileSize: blob.size
  };
};
