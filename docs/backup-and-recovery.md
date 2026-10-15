# Backup and recovery

Status: PROTOTYPE. Every step that touches the real Firebase project is marked NOT RUN. Nothing in this file has been executed against a real project. Run each step once in a test setup first.

## What is backed up

- Firestore data: reports, report updates, users, teams, notifications, hotline config, audit logs. Device tokens are rebuilt automatically when users sign in, but include them in the export anyway.
- Firebase Auth accounts are NOT in a Firestore export. Export them separately, or accept that users must re-register after a disaster restore (Auth export is a separate step; NOT RUN).
- Photos are stored in Cloudinary, not Firestore. The Firestore export only holds photo URLs. Back up Cloudinary separately (its dashboard or API), or accept that photo URLs may break after a restore.

## How often

Recommended: a daily scheduled export, kept for 30 days (a Cloud Storage lifecycle rule deletes older exports). For a live response, consider every 6 hours. These are suggestions for the group to confirm.

## 1. Set up the Cloud Storage bucket (NOT RUN)

Needs the real Firebase project, billing, and `gcloud` logged in.

1. `gcloud auth login`
2. `gcloud config set project <your-project-id>`
3. Create a bucket in the same region as Firestore (for example `asia-southeast1`):
   `gcloud storage buckets create gs://<your-project-id>-firestore-backups --location=asia-southeast1 --uniform-bucket-level-access`
4. Keep exports for 30 days with a lifecycle rule (save as `lifecycle.json`):
   `{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}`
   then `gcloud storage buckets update gs://<your-project-id>-firestore-backups --lifecycle-file=lifecycle.json`
5. Grant the Firestore service agent write access to the bucket. Find the agent address in the Google Cloud console (IAM, service agents), then add the role `Storage Object Admin` on the bucket.

Check: the Firestore managed export to Cloud Storage may need the Blaze (pay-as-you-go) plan, while the project is on Spark. Confirm the current Firebase pricing before relying on it. NOT RUN.

## 2. Run an export by hand (NOT RUN)

`gcloud firestore export gs://<your-project-id>-firestore-backups/manual-$(date +%Y-%m-%d-%H%M) --project=<your-project-id>`

Check the result: `gcloud firestore operations list --project=<your-project-id>` should show the operation as done, and the folder should appear in the bucket. NOT RUN.

## 3. Schedule the export (NOT RUN)

Option A (simplest): a daily job on a machine with `gcloud` installed, using cron:
`0 2 * * * gcloud firestore export gs://<your-project-id>-firestore-backups/daily-$(date +\%Y-\%m-\%d) --project=<your-project-id>`

Option B: Cloud Scheduler calling the Firestore Admin API `exportDocuments` endpoint with the same bucket. Needs a service account with the Datastore Import Export Admin role.

Either way, check the job ran the next day. NOT RUN.

## 4. Restore (NOT RUN, practice on a test project first)

A Firestore import writes into the target project. Documents with the same path are overwritten. Restore into a NEW test project first, then decide whether to move data back.

1. Pick the export folder: `gcloud storage ls gs://<your-project-id>-firestore-backups/`
2. Restore into a test project: `gcloud firestore import gs://<your-project-id>-firestore-backups/<export-folder> --project=<test-project-id>`
3. Check counts and a few reports in the console, and check the audit log.
4. Only for a real restore: stop writes (put the API in maintenance, or tell dispatchers to pause), run the import on the real project, then restart. Note that this overwrites current data with the backup.
5. Recreate Auth accounts if needed (see above). Run the seed only on a test project.

NOT RUN for every step above.

## 5. Recovery targets

- Recovery point: the time of the last successful export (daily means up to 24 hours of data may be lost).
- Recovery time: not measured. Time a full restore on a test project before relying on it.

## 6. Open items

1. Choose the export frequency and retention. (Not decided.)
2. Confirm the plan (Spark vs Blaze) needed for managed exports. (NOT checked.)
3. Set up Cloudinary backups or accept photo loss risk. (Not decided.)
4. Measure a real restore. (NOT RUN.)
