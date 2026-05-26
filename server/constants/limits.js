export const MS = Object.freeze({
  MINUTE: 60_000,
  HOUR:   3_600_000,
  DAY:    86_400_000,
});

export const RATE_LIMIT_WINDOW_MS      = 15 * MS.MINUTE;
export const AUTH_RATE_LIMIT_WINDOW_MS = MS.HOUR;
export const UPLOAD_MAX_BYTES          = 20 * 1024 * 1024;   // 20 MB
export const CSV_MAX_BYTES             =  5 * 1024 * 1024;   //  5 MB
export const TOKEN_CLEANUP_INTERVAL_MS =  6 * MS.HOUR;
export const REFRESH_TOKEN_TTL_MS      =  7 * MS.DAY;
export const OTP_TTL_MS                = 15 * MS.MINUTE;
export const ACCESS_TOKEN_TTL_MS       = MS.HOUR;
