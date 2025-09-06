import { formatTime, calculateTimePercentage } from '../../utils/time';

describe('time utils', () => {
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('0s');
      expect(formatTime(45)).toBe('45s');
      expect(formatTime(60)).toBe('1m');
      expect(formatTime(90)).toBe('1m'); // It floors minutes
      expect(formatTime(125)).toBe('2m');
      expect(formatTime(3600)).toBe('1h 0m');
      expect(formatTime(5400)).toBe('1h 30m');
      expect(formatTime(5435)).toBe('1h 30m');
    });
  });

  describe('calculateTimePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateTimePercentage(50, 100)).toBe(50);
      expect(calculateTimePercentage(0, 100)).toBe(0);
      expect(calculateTimePercentage(100, 100)).toBe(100);
      expect(calculateTimePercentage(25, 50)).toBe(50);
    });

    it('should handle total of 0 to avoid division by zero', () => {
      expect(calculateTimePercentage(10, 0)).toBe(0);
    });

    it('should clamp values between 0 and 100', () => {
      expect(calculateTimePercentage(110, 100)).toBe(100);
      expect(calculateTimePercentage(-10, 100)).toBe(0);
    });
  });
});
