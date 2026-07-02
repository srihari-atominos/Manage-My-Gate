import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend local directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is required but not defined.`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || 'localhost',
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
  encryptionKey: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
  cors: {
    allowedOrigins: (() => {
      const origins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8000', 'http://localhost:8080'];
      const host = process.env.HOST || 'localhost';
      const port = parseInt(process.env.PORT || '5000', 10);
      origins.push(`http://${host}:${port}`);
      origins.push(`http://127.0.0.1:${port}`);
      if (host !== 'localhost') {
        origins.push(`http://localhost:${port}`);
      }
      return [...new Set(origins)];
    })()
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  avatarUploadPath: process.env.AVATAR_UPLOAD_PATH || 'uploads/avatars',
  sso: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  },
};

export default config;
