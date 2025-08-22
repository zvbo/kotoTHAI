/**
 * Formats seconds into a human-readable time string
 * @param seconds Total seconds to format
 * @returns Formatted time string (e.g., "1h 30m" or "45s")
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) {
    return "0s";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  let result = "";
  
  if (hours > 0) {
    result += `${hours}h `;
  }
  
  if (minutes > 0 || hours > 0) {
    result += `${minutes}m`;
  } else {
    result += `${remainingSeconds}s`;
  }
  
  return result.trim();
}

/**
 * Calculates the percentage of time remaining
 * @param remaining Remaining seconds
 * @param total Total seconds
 * @returns Percentage as a number between 0 and 100
 */
export function calculateTimePercentage(remaining: number, total: number): number {
  if (total <= 0) return 0;
  const percentage = (remaining / total) * 100;
  return Math.max(0, Math.min(100, percentage));
}