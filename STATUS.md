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

## Final note

The branch comparison shows that `acar` is not a narrow cherry-pick of `main`; it is a broader backend state. If you want only the DB changes on `main`, treat them as a selective copy rather than a normal branch merge.
