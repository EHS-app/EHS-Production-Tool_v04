# Secrets checklist (NAMES ONLY — copy values from Replit Secrets panel BEFORE deleting the app)
# 
# When you restore from the zip + database dump, you must re-enter these in
# the new Replit project's Secrets panel. Do NOT commit values to git/zip.
#
# Required for the app to run:

- [ ] DATABASE_URL  (auto-provisioned by Replit when you create a new Postgres DB — no need to copy)
- [ ] SESSION_SECRET  (any long random string is fine; Replit can regenerate)
- [ ] DEFAULT_OBJECT_STORAGE_BUCKET_ID  (will change with new Object Storage bucket)
- [ ] PRIVATE_OBJECT_DIR
- [ ] PUBLIC_OBJECT_SEARCH_PATHS
- [ ] VITE_CLERK_PUBLISHABLE_KEY  (lives in .replit file already, but double-check after import)

## Restore order (next year)

1. Create a new Replit project, choose 'Import from ZIP', upload ehs-source-YYYY-MM-DD.zip
2. Wait for pnpm install to finish
3. Add a Postgres database via the Database tool (this sets DATABASE_URL automatically)
4. Restore the dump:  psql $DATABASE_URL < ehs-database-YYYY-MM-DD.sql
5. Add an Object Storage bucket via the App Storage tool (this sets the DEFAULT_OBJECT_STORAGE_BUCKET_ID/PRIVATE_OBJECT_DIR/PUBLIC_OBJECT_SEARCH_PATHS automatically)
6. Re-enter SESSION_SECRET in Secrets
7. Restart workflows; the app should be running again
