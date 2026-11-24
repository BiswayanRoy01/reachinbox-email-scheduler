import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox_db?schema=public"
  },

  redis: {
    url:
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`
  },

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
    username: process.env.ELASTICSEARCH_USERNAME || "",
    password: process.env.ELASTICSEARCH_PASSWORD || "",
    index: "reachinbox_emails"
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      process.env.SESSION_SECRET ||
      "default_jwt_secret_reachinbox_must_be_changed_32chars",
    expiresIn: "7d"
  },

  encryption: {
    key:
      process.env.TOKEN_ENCRYPTION_KEY ||
      process.env.ENCRYPTION_KEY ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback"
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    redirectUri:
      process.env.SLACK_CALLBACK_URL ||
      process.env.SLACK_REDIRECT_URI ||
      "http://localhost:5000/api/v1/slack/callback",
    scopes: process.env.SLACK_SCOPES || "chat:write,channels:read,groups:read"
  },

  smtp: {
    host: process.env.ETHEREAL_HOST || process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.ETHEREAL_PORT || process.env.SMTP_PORT || "587", 10),
    user: process.env.ETHEREAL_USER || process.env.SMTP_USER || "",
    pass: process.env.ETHEREAL_PASS || process.env.SMTP_PASS || "",
    fromName: process.env.SMTP_FROM_NAME || "ReachInbox Scheduler"
  },

  worker: {
    concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || "5", 10),
    delayBetweenEmailsSeconds: parseInt(
      process.env.DEFAULT_EMAIL_DELAY_SECONDS || process.env.EMAIL_DELAY_SECONDS || "2",
      10
    ),
    maxEmailsPerHour: parseInt(
      process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ||
        process.env.MAX_EMAILS_PER_HOUR ||
        "100",
      10
    )
  },

  bullBoard: {
    username: process.env.BULL_BOARD_USERNAME || "admin",
    password: process.env.BULL_BOARD_PASSWORD || "admin_password"
  }
};
