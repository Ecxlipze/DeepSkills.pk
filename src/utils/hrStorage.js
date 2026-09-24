import { supabase } from '../supabaseClient';
import { MAX_HR_FILE_SIZE_BYTES, ALLOWED_HR_EXTENSIONS_RAW } from './hrDocuments';

const sanitizeFileName = (value) =>
  value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

export const uploadHrAsset = async ({
  bucket,
  file,
  teacherId,
  candidateId,
  isStaff = false,
  hrProfileId,
  docType,
  customName
}) => {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (file.size > MAX_HR_FILE_SIZE_BYTES) {
    throw new Error(`File "${file.name}" exceeds the 10 MB limit.`);
  }

  const fileExt = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_HR_EXTENSIONS_RAW.includes(fileExt)) {
    throw new Error(`File type ".${fileExt}" is not allowed. Only images, PDF, DOCX, and ZIP files are accepted.`);
  }

  const id = candidateId || teacherId;
  const prefixType = isStaff ? 'staff' : 'teacher';
  const lastDot = file.name.lastIndexOf('.');
  const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
  const cleanBase = sanitizeFileName(baseName);
  const cleanCustom = customName ? sanitizeFileName(customName) : `${Date.now()}-${cleanBase}`;
  const filePath = `${prefixType}-${id}/profile-${hrProfileId}/${docType}/${cleanCustom}.${fileExt}`;

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
  candidateId,
  isStaff = false,
  hrProfileId,
  fileType
}) => {
  const id = candidateId || teacherId;
  const prefixType = isStaff ? 'staff' : 'teacher';
  const cleanName = sanitizeFileName(fileName);
  const filePath = `${prefixType}-${id}/profile-${hrProfileId}/${fileType}/${cleanName}`;

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
