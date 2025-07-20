export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileType = (file: File): string => {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'text/markdown' || file.name.endsWith('.md')) return 'md';
  if (file.type === 'text/plain') return 'md'; // Treat plain text as markdown
  // Default fallback
  return 'md';
};

export const validateFileType = (file: File): boolean => {
  const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
  const isMarkdown = file.name.endsWith('.md');
  return allowedTypes.includes(file.type) || isMarkdown;
};
