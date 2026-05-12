import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "..", "logs");

winston.addColors({
    error:   "bold red",
    warn:    "bold yellow",
    info:    "bold cyan",
    http:    "bold magenta",
    debug:   "bold green",
    verbose: "bold white",
});

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),           // print stack traces
    winston.format.splat(),                           // support %s, %d, etc.
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length
            ? `\n  ${JSON.stringify(meta, null, 2)}`
            : "";
        return stack
            ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}${metaStr}`
            : `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
);

const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length
            ? `\n  ${JSON.stringify(meta, null, 2)}`
            : "";
        return stack
            ? `[${timestamp}] ${level}: ${message}\n${stack}${metaStr}`
            : `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
    silent: process.env.NODE_ENV === "test",
});

const combinedRotate = new DailyRotateFile({
    dirname:        LOG_DIR,
    filename:       "combined-%DATE%.log",
    datePattern:    "YYYY-MM-DD",
    zippedArchive:  true,
    maxSize:        "20m",
    maxFiles:       "30d",
    format:         logFormat,
    level:          "http",
});

const errorRotate = new DailyRotateFile({
    dirname:        LOG_DIR,
    filename:       "error-%DATE%.log",
    datePattern:    "YYYY-MM-DD",
    zippedArchive:  true,
    maxSize:        "20m",
    maxFiles:       "90d",
    format:         logFormat,
    level:          "error",
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "http" : "debug"),
    transports: [
        consoleTransport,
        combinedRotate,
        errorRotate,
    ],
    exitOnError: false,
});

logger.logRequest = (req) => {
    logger.http(`${req.method} ${req.originalUrl}`, {
        ip:      req.ip,
        body:    req.body,
        query:   req.query,
    });
};

logger.logResponse = (req, res, durationMs) => {
    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "http";

    logger[level](`${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`);
};

export default logger;
