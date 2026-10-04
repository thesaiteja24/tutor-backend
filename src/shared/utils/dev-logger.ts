import fs from "node:fs";
import path from "node:path";

import { getErrorMessage } from "./errors.js";

const LOGS_DIR = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists in development
if (process.env.NODE_ENV !== "production") {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class DevLogger {
  private isDev = process.env.NODE_ENV !== "production";
  private backendLogPath = path.join(LOGS_DIR, "backend.log");
  private errorLogPath = path.join(LOGS_DIR, "error.log");
  private mobileLogPath = path.join(LOGS_DIR, "mobile.log");

  private append(filePath: string, line: string) {
    if (!this.isDev) return;
    try {
      fs.appendFileSync(filePath, line + "\n", "utf-8");
    } catch (e) {
      console.error("[DevLogger] Failed to write log:", e);
    }
  }

  private format(level: LogLevel, tag: string, message: string, data?: unknown, err?: unknown): string {
    const timestamp = new Date().toISOString();
    let entry = `[${timestamp}] [${level}] [${tag}] ${message}`;

    if (data !== undefined) {
      try {
        const serialized = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        entry += `\n  Data: ${serialized}`;
      } catch {
        entry += "\n  Data: [Unserializable Object]";
      }
    }

    if (err) {
      const errMsg = getErrorMessage(err);
      entry += `\n  Error: ${errMsg}`;
      if (err instanceof Error && err.stack) {
        entry += `\n  Stack: ${err.stack}`;
      }
    }

    return entry;
  }

  log(level: LogLevel, tag: string, message: string, data?: unknown, err?: unknown) {
    if (!this.isDev) return;
    const formatted = this.format(level, tag, message, data, err);

    this.append(this.backendLogPath, formatted);

    if (level === "ERROR" || err) {
      this.append(this.errorLogPath, formatted);
    }
  }

  debug(tag: string, message: string, data?: unknown) {
    this.log("DEBUG", tag, message, data);
  }

  info(tag: string, message: string, data?: unknown) {
    this.log("INFO", tag, message, data);
  }

  warn(tag: string, message: string, data?: unknown, err?: unknown) {
    this.log("WARN", tag, message, data, err);
  }

  error(tag: string, message: string, err?: unknown, data?: unknown) {
    this.log("ERROR", tag, message, data, err);
  }

  logMobile(entry: { level?: LogLevel; tag?: string; message: string; data?: unknown; error?: unknown }) {
    if (!this.isDev) return;
    const level = entry.level || "INFO";
    const tag = entry.tag || "MobileApp";
    const formatted = this.format(level, tag, entry.message, entry.data, entry.error);
    this.append(this.mobileLogPath, formatted);

    if (level === "ERROR" || entry.error) {
      this.append(this.errorLogPath, formatted);
    }
  }
}

export const devLogger = new DevLogger();
