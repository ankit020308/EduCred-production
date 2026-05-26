import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom log format for development
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const isProd = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd 
    ? combine(timestamp(), json()) // Structured JSON logging in prod for log drains (e.g. Render/Datadog)
    : combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat), // Colored console in dev
  transports: [
    new winston.transports.Console()
  ]
});

// Create a stream object for Morgan middleware to pipe HTTP logs to Winston
export const stream = {
  write: (message) => {
    // Morgan adds a newline character at the end; trim it to avoid empty lines in logs
    logger.info(message.trim());
  }
};
