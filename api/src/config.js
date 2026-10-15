export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    firebaseProjectId: env.FIREBASE_PROJECT_ID,
    // Firebase Admin reads the service account file from this path.
    serviceAccountPath: env.GOOGLE_APPLICATION_CREDENTIALS,
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    },
  };
}
