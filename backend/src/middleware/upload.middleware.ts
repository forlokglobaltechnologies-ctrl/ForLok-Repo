import { MultipartFile } from '@fastify/multipart';
import { FILE_LIMITS } from '../config/constants';

export function validateFileUpload(file: MultipartFile): string | null {
  if (!file) {
    return 'No file uploaded';
  }

  // Check file size (if available)
  if (file.file && (file.file as any).bytesRead > FILE_LIMITS.MAX_FILE_SIZE) {
    return `File size exceeds limit of ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  // Check file type
  const allowedTypes = [
    ...FILE_LIMITS.ALLOWED_IMAGE_TYPES,
    ...FILE_LIMITS.ALLOWED_DOCUMENT_TYPES,
  ];

  if (file.mimetype && !allowedTypes.includes(file.mimetype as any)) {
    return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
  }

  return null;
}
