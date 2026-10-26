# Data Flow: From Entry to the Lake

This document describes the current data flow in SuaraLens from the user entry point to the data lake / analytical output layer. It highlights the operational path, the ML inference path, and the downstream analytics pipeline.

## 1. High-level architecture

The system currently behaves like a hybrid of:

- an operational complaint system (web app + backend DB)
- an ML inference service (PII redaction + classification + sentiment)
- a data lake / analytics layer (JSONL and output artifacts used by notebooks and dashboard analysis)

The real flow is:

User/Reporter -> Frontend -> Backend API -> ML Service -> Operational DB -> Analytics / Data Lake -> Dashboard / Notebook consumption

---

## 2. Entry point

### 2.1 Frontend submission
The first entry point is the frontend complaint API layer:

- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/services/complaintApi.js](frontend/src/services/complaintApi.js)

The client sends HTTP requests to the backend using Axios, with auth token injection and 401 redirect handling.

Key behavior:

- base URL is configured through `VITE_API_URL` or default `/api`
- auth token is read from `localStorage['suaralens_token']`
- complaint submission is done through `post('/complaints', formData, ...)`

This is the user-facing ingress layer.

### 2.2 Backend API route
The API entry route is registered here:

- [backend/app/Config/Routes.php](backend/app/Config/Routes.php)

Relevant complaint endpoints:

- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/{id}`
- `PATCH /api/complaints/{id}/status`

The operational complaint workflow starts here.

---

## 3. Ingestion and validation in backend

The main ingestion logic lives in:

- [backend/app/Controllers/ComplaintController.php](backend/app/Controllers/ComplaintController.php)

In `create()`, the backend does the following:

1. Reads JSON or form input.
2. Requires authenticated user + valid `type` + `description`.
3. Sends the complaint text to the ML service for analysis.
4. Validates the ML response.
5. Stores the complaint row.
6. Stores the analysis result.
7. Optionally creates a human review record.

Important rule:

- the original raw user text is not stored directly as final complaint content
- the text stored in the complaint model is the redacted value produced by the ML pipeline (`analysis['redacted_text']`)

This is a privacy-first design choice.

---

## 4. ML service: the intelligence layer

The actual ML/NLP processing happens in:

- [ml-service/main.py](ml-service/main.py)
- [ml-service/pii_redactor.py](ml-service/pii_redactor.py)
- [ml-service/llm_engine.py](ml-service/llm_engine.py)

### 4.1 PII redaction
`main.py` calls `anonymize_text(text)`.

The redaction engine in `pii_redactor.py` uses Presidio to detect and anonymize:

- email addresses
- phone numbers
- URLs

This step ensures the complaint content is safe before classification and storage.

### 4.2 LLM classification
The backend sends a POST request to the ML service endpoint:

- `http://localhost:8000/analyze`

Inside the ML service:

- the incoming text is validated
- PII is anonymized
- the text is classified using LLM calls to Ollama (`qwen3:8b`)
- urgency is assigned (`low`, `medium`, `high`, `critical`)
- sentiment is computed separately

The ML service returns a normalized payload containing:

- `redacted_text`
- `category`
- `category_confidence`
- `urgency_label`
- `urgency_score`
- `urgency_reason`
- `sentiment`
- `sentiment_score`
- `requires_review`

### 4.3 Review gate
If confidence is below threshold or urgency is high/critical, the result can trigger a human review path.

This introduces the HITL step in the operational workflow.

---

## 5. Persistence to the operational store

The complaint is saved to the application database using:

- [backend/app/Models/ComplaintModel.php](backend/app/Models/ComplaintModel.php)

The complaint table contains core operational columns such as:

- `ticket_id`
- `user_id`
- `type`
- `description`
- `is_anonymous`
- `status`
- `assigned_unit`
- `created_at`
- `updated_at`

The analysis result is stored separately through the complaint analysis model, which keeps the ML-derived metadata separated from the complaint record itself.

This makes the operational model cleaner:

- complaint record = the protected, user-submitted issue
- analysis record = model output and classification metadata

The database connection is configured in:

- [backend/app/Config/Database.php](backend/app/Config/Database.php)

---

## 6. The data lake and analytics layer

The project also contains a data-science/analytics layer that prepares dataset artifacts for mining, evaluation, and dashboard consumption.

### 6.1 Raw data landing zone
The repository includes raw dataset files under:

- [data/suaralens_dummy_simulasi.jsonl](data/suaralens_dummy_simulasi.jsonl)
- [data/suaralens_dummy_uji.jsonl](data/suaralens_dummy_uji.jsonl)

These are raw JSONL records used as the ingestion source for data analysis notebooks.

### 6.2 Notebook pipeline
The mining notebook generator is:

- [generate_nb08.py](generate_nb08.py)

This script creates a notebook that loads the dataset from:

- `../data/suaralens_dummy_simulasi.jsonl`

and then performs:

- preprocessing and cleaning
- clustering
- topic modeling
- association rules
- TF-IDF classification baseline
- anomaly detection

### 6.3 Output artifact writing
The notebook writes output to:

- `../data/output/data_mining_results.json`

The output payload contains aggregated insights such as:

- clustering results
- topic-modeling metadata
- association rules
- classification metrics
- anomaly detection summary

This is effectively the analytical lake artifact for web/dashboard consumption.

---

## 7. Full end-to-end data flow

### Operational flow
1. User enters complaint text in the frontend.
2. Frontend sends request to backend `/api/complaints`.
3. Backend validates auth and form payload.
4. Backend sends complaint text to ML service `/analyze`.
5. ML service redacts PII and classifies the complaint.
6. Backend stores the complaint row in the application DB.
7. Backend stores the analysis metadata in a related table.
8. Optional HITL review is created if needed.
9. Dashboard reads analytics from the persisted app data or derived data artifacts.

### Analytical flow
1. Raw JSONL data lands in the `data/` directory.
2. Notebook scripts load those files.
3. Data is cleaned, transformed, and modeled.
4. Results are serialized to `data/output/*.json`.
5. Dashboard or downstream tools consume these generated artifacts.

---

## 8. What the repository currently represents

At this moment, the project is best understood as a two-layer data architecture:

### Layer A: Production / operational data
- complaint intake
- auth and users
- complaint status lifecycle
- ML inference results
- DB-backed operational records

### Layer B: Analytical / lake data
- JSONL datasets
- outputs from notebooks
- generated analytical JSON artifacts
- data-mining insights for dashboards

These are related but not yet fully unified into a single enterprise data-lake pipeline.

---

## 9. Current gaps for a more mature lake architecture

To move from a prototype to a true data lake, the project should add:

- explicit raw / curated / processed / trusted zones
- automated ingestion from operational DB to lake storage
- schema versioning for ML outputs
- a common metadata catalog
- ETL/ELT jobs for recurring batch processing
- retention and governance policies for complaint data
- clear separation of raw user content, redacted content, and model outputs

---

## 10. Summary

The current flow is:

Frontend user input -> backend validation -> ML service redaction + classification -> operational DB persistence -> notebook-based data mining -> JSON output in `data/output` -> dashboard analytics consumption.

This is a sensible first architecture for an AI-powered public feedback system, and it already contains the core ingredients of a data pipeline. The main remaining work is to formalize the lake stages and automate the movement of data between the operational store and the analytical store.

---

## 11. Planned entry limits and protections

The complaint entry point should have traffic and payload guardrails, not a fixed lifetime cap on stored complaints. These controls are planned; they are not implemented yet.

### Initial policy to implement

1. **Limit submissions per authenticated account.** Start with a configurable limit of 5 complaint submissions per account per minute. Return HTTP `429 Too Many Requests` with a `Retry-After` value when the limit is exceeded.
2. **Bound request size and text length.** Reject oversized requests before calling the ML service. Start with a 32 KiB request-body cap and a 5,000-character description limit; return HTTP `413 Payload Too Large` for requests exceeding the applicable limit. Align the web-server and application limits so the request is not rejected unpredictably upstream.
3. **Protect the ML dependency from overload.** Measure inference latency and concurrent requests, then set a configurable concurrency bound based on load testing. When capacity is exhausted, reject promptly with a retryable response rather than letting requests wait until their 120-second ML timeout.
4. **Keep limits configurable and observable.** Record counts, rejections, queue/concurrency pressure, and inference latency without logging complaint text or other sensitive content. Review thresholds using real usage and load-test results.
5. **Consider an IP-based secondary limit only after proxy behavior is understood.** Many campus users may share an IP, so an aggressive IP limit could block legitimate submissions. If added, make it configurable and ensure client IPs are derived safely when behind a trusted proxy.

### Implementation order and acceptance checks

- Add request-size and description-length validation at the API boundary, before ML inference.
- Add per-account rate limiting at the complaint creation route/controller and ensure repeated requests receive `429` without being sent to the ML service.
- Add a bounded ML concurrency/backpressure mechanism after measuring the deployment; return a clear retryable error when saturated.
- Test below-limit requests, rate-limit responses and `Retry-After`, oversized body/text rejection, and that rejected requests do not invoke ML or write complaint/analysis rows.
- Load-test the configured limits, then document the measured sustainable throughput and revise the initial thresholds as needed.

These limits govern admission rate and per-request work. They do not cap the number of records that may be stored in the operational database or data lake.

---

## 12. Scheduled analytics aggregates and lake snapshots

The analytics-only batch is implemented as a CodeIgniter CLI command. It refreshes rolling aggregates for 7, 30, 90, and 180 days together and does not modify complaints, analyses, or complaint statuses in the operational database.

### Schedule and execution

- Window boundaries: each aggregate covers the exact N days before the batch run time, using `Asia/Jakarta`. For example, a 30-day window is `[run time - 30 days, run time)`.
- Scheduled run: every Monday at 02:00 `Asia/Jakarta`. The window end is the actual job run time, so delayed runs shift the rolling window accordingly.
- Command: `php backend/spark analytics:refresh-weekly` from the repository root.
- The same command can be run manually to create the initial snapshots or retry a missed run. It recomputes all four windows and appends a new immutable snapshot.
- Configure the command with the deployment's scheduler. On Cronie-based Linux hosts, add `CRON_TZ=Asia/Jakarta` and schedule `0 2 * * 1 cd /path/to/repository && php backend/spark analytics:refresh-weekly >> backend/writable/logs/weekly-analytics.log 2>&1`. For other cron implementations, configure the scheduler timezone as `Asia/Jakarta`. For Windows Task Scheduler, configure a weekly Monday trigger at 02:00 in the `Asia/Jakarta` local timezone and run `php.exe` with arguments `backend/spark analytics:refresh-weekly`, using the repository root as the working directory.

The output directory defaults to `../data/output/weekly_analytics` relative to the backend root and can be changed with `WEEKLY_ANALYTICS_OUTPUT_DIR`. The command writes one dated JSON snapshot containing all four windows per run, for example `analytics-20261026T020000-abc123.json`. If this is a first deployment, run the command once manually to make aggregates available.

### Snapshot contents and access

For each requested lookback window, the batch reads complaint creation timestamps and each complaint's latest saved analysis, then writes aggregate-only data to the lake:

- complaint count for the week
- most common model-assigned categories (`popular_topics`)
- aggregate sentiment counts
- busiest assigned units
- status counts
- a deterministic Indonesian and English summary based on those counts

It does not export descriptions, ticket IDs, reporter identities, or individual complaint rows. “Popular topics” currently means the saved analysis categories, not unsupervised keyword/topic mining.
Window boundaries are interpreted in `Asia/Jakarta` and converted to UTC for the current database timestamp convention. Status counts reflect each complaint's status when the job runs, not a historical reconstruction of status transitions at the end of the selected window.

The backend exposes the latest available snapshot through `GET /api/analytics/weekly?days=7|30|90|180`, restricted to admins only. Stakeholders can continue using the existing live analytics endpoints, but cannot read these lake aggregates. Admins can select the rolling window on the analytics page and view its summary, popular categories, negative-sentiment share, and busiest unit. If no snapshot exists yet, the page explains that the batch has not run.

These are scheduled snapshots: they change only when the CLI batch runs, while other live analytics endpoints continue to calculate from the operational database when requested. The repository provides the portable command and schedule specification; the deployment scheduler must be configured separately.
