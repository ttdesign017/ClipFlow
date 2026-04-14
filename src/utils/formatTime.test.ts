import { formatTime } from '../utils/formatTime';

describe('formatTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "刚刚" for recent timestamps (< 60s)', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    expect(formatTime(thirtySecondsAgo)).toBe('刚刚');
  });

  it('should return minutes for timestamps < 1 hour', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    expect(formatTime(fiveMinutesAgo)).toBe('5 分钟前');

    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    expect(formatTime(thirtyMinutesAgo)).toBe('30 分钟前');
  });

  it('should return hours for timestamps < 24 hours', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(formatTime(threeHoursAgo)).toBe('3 小时前');

    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    expect(formatTime(twelveHoursAgo)).toBe('12 小时前');
  });

  it('should return days for timestamps < 7 days', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(formatTime(twoDaysAgo)).toBe('2 天前');

    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    expect(formatTime(sixDaysAgo)).toBe('6 天前');
  });

  it('should return date string for timestamps >= 7 days', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const result = formatTime(tenDaysAgo);
    // Should be a date string (e.g., "2026/4/3" or similar)
    expect(result).toMatch(/\d{4}[/年]/);
  });

  it('should handle current timestamp', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    expect(formatTime(Date.now())).toBe('刚刚');
  });

  it('should handle boundary: exactly 60 seconds', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const exactlyOneMinute = Date.now() - 60 * 1000;
    expect(formatTime(exactlyOneMinute)).toBe('1 分钟前');
  });

  it('should handle boundary: exactly 24 hours', () => {
    vi.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
    const exactlyOneDay = Date.now() - 24 * 60 * 60 * 1000;
    expect(formatTime(exactlyOneDay)).toBe('1 天前');
  });
});
