// Reusable general helper utilities
export const formatWordsCount = (count: number): string => {
  return new Intl.NumberFormat().format(count);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};
