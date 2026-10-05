# Status Comparison: acar vs main

## Summary

The `acar` branch is not a small delta from `main`. The branch comparison shows a large set of added framework/backend files, especially under the CodeIgniter backend tree, rather than just a few database-related edits.

## Evidence

The following Git comparison was run:

```bash
git diff --stat main...acar
git diff --name-status main...acar
```

It showed a broad set of additions, including files such as:

- `backend/system/...`
- `backend/app/Config/...`
- `backend/app/Common.php`
- `backend/app/.htaccess`

This means the `acar` branch contains a much larger backend snapshot than `main`.

## Important implication

If the goal is to keep only the database-related work, then the cleanest approach is to copy only these two files into the main worktree:

- `backend/app/Config/Database.php`
- `data/output/suaralens_dummy_simulasi_postgres.sql`

and commit only those two changes.

## Relevant database configuration

The current app configuration is set to PostgreSQL:

- Database name: `suaralens`
- Host: `localhost`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

This is configured in:

- `backend/app/Config/Database.php`

## Relevant SQL dump

The generated PostgreSQL import file is:

- `data/output/suaralens_dummy_simulasi_postgres.sql`

This file creates the table `public.suaralens_dummy_simulasi` and inserts the 5150 generated records.

## Feature comparison: what both sides have vs what is missing

### Available in both

The shared app surface already includes the main product shell:

- public landing page
- sign in and sign up flows
- user complaint submission flow
- user complaint history page
- stakeholder dashboard
- complaint list and complaint detail
- analytics dashboard UI
- follow-ups / evidence / settings screens
- API structure for complaints and analytics

These are visible in:

- `frontend/src/App.jsx`
- `frontend/src/services/complaintApi.js`
- `frontend/src/services/analyticsApi.js`
- `backend/app/Config/Routes.php`

### Available mostly on `acar`

The richer implementation is on `acar` and includes:

- real backend controllers for complaint workflows
- real analytics endpoints
- review / human-in-the-loop processing
- database migration and seed infrastructure
- PostgreSQL configuration and dump generation
- dataset import logic for the complaint records
- mock mode plus backend-ready API contract

These are in:

- `backend/app/Controllers/ComplaintController.php`
- `backend/app/Controllers/ReviewController.php`
- `backend/app/Controllers/AnalyticsController.php`
- `backend/app/Database/Seeds/UserSeeder.php`
- `backend/app/Database/Seeds/ComplaintSeeder.php`
- `jsonl_to_postgres_sql.py`
- `data/output/suaralens_dummy_simulasi_postgres.sql`

### Missing / not yet complete

These are the main gaps to define as the next work items:

- live DB + API integration in the frontend
- real PostgreSQL schema setup and migration execution
- complete complaint lifecycle from create to status update to reply
- review queue and approval workflow completion
- analytics connected to persistent backend data instead of mock responses
- permission enforcement and user-role validation cleanup
- production-ready error handling and loading states

## Next-work backlog

### Must-have

1. Connect frontend services to the real backend endpoints.
2. Create and validate the PostgreSQL database and schema.
3. Import the generated SQL dump.
4. Make complaint submission, status changes, and analytics read real data.
5. Complete the review workflow end-to-end.

### Should-have

1. Align field names and response payloads between frontend and backend.
2. Clean up null handling and authorization rules.
3. Improve error and loading UX.

### Nice-to-have

1. Polished notifications and visibility for review queue.
2. Evidence attachment workflow improvements.
3. Additional reporting and filtering features.

## Final note

The overall gap is not in the UI shell; it is in real backend integration, database readiness, and end-to-end workflow completion. The product foundation already exists, but the live data path still needs to be completed.
