export function loadConfig(env = process.env) {
  return {
    // Set only by the local emulator demo. Production never sets FIRESTORE_EMULATOR_HOST.
    emulator: Boolean(env.FIRESTORE_EMULATOR_HOST),
    port: Number(env.PORT) || 3000,
    // Number of proxy hops in front of the API (0 when serving directly).
    trustProxy: Number(env.TRUST_PROXY) || 0,
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

export function validateConfig(config) {
  // The emulator needs no Cloudinary or service account. Photo uploads will fail there, which the demo does not use.
  if (config.emulator) return config;
  const required = [
    ['CLOUDINARY_CLOUD_NAME', config.cloudinary.cloudName],
    ['CLOUDINARY_API_KEY', config.cloudinary.apiKey],
    ['CLOUDINARY_API_SECRET', config.cloudinary.apiSecret],
    ['GOOGLE_APPLICATION_CREDENTIALS', config.serviceAccountPath],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  return config;
}
