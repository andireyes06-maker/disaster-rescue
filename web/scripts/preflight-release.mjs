import { loadEnv } from 'vite';
import { validateReleaseEnv } from './release-env.mjs';

const errors = validateReleaseEnv(loadEnv('production', process.cwd(), 'VITE_'));
if (errors.length) {
  console.error('Release configuration is incomplete:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Release configuration check passed. Endpoint availability and sign-in still require deployment verification.');
}
