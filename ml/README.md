# **Machine Learning Block**
===
## **Arsitektur**
```
suaralens/
│
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml
├── Makefile
│
├── backend/
│   │
│   ├── app/
│   │   ├── Config/
│   │   │   ├── App.php
│   │   │   ├── Database.php
│   │   │   ├── Routes.php
│   │   │   └── Services.php
│   │   │
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginController.php
│   │   │   │   └── LogoutController.php
│   │   │   │
│   │   │   ├── ComplaintController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── AnalyticsController.php
│   │   │   ├── FollowUpController.php
│   │   │   ├── FeedbackController.php
│   │   │   ├── EvidenceController.php
│   │   │   └── MLController.php
│   │   │
│   │   ├── Models/
│   │   │   ├── UserModel.php
│   │   │   ├── RoleModel.php
│   │   │   ├── UnitModel.php
│   │   │   ├── ComplaintModel.php
│   │   │   ├── ComplaintLabelModel.php
│   │   │   ├── ComplaintEmbeddingModel.php
│   │   │   ├── FollowUpModel.php
│   │   │   ├── SLAEventModel.php
│   │   │   ├── FeedbackModel.php
│   │   │   └── AuditLogModel.php
│   │   │
│   │   ├── Services/
│   │   │   ├── MLService.php
│   │   │   ├── ComplaintService.php
│   │   │   ├── SLAService.php
│   │   │   ├── PriorityService.php
│   │   │   ├── FeedbackService.php
│   │   │   └── EvidenceService.php
│   │   │
│   │   ├── Filters/
│   │   │   ├── AuthFilter.php
│   │   │   ├── RoleFilter.php
│   │   │   └── RateLimitFilter.php
│   │   │
│   │   ├── Validation/
│   │   │   ├── ComplaintValidation.php
│   │   │   └── FollowUpValidation.php
│   │   │
│   │   ├── Database/
│   │   │   ├── Migrations/
│   │   │   │   ├── 001_CreateUsers.php
│   │   │   │   ├── 002_CreateUnits.php
│   │   │   │   ├── 003_CreateComplaints.php
│   │   │   │   ├── 004_CreateComplaintLabels.php
│   │   │   │   ├── 005_CreateEmbeddings.php
│   │   │   │   ├── 006_CreateFollowUps.php
│   │   │   │   ├── 007_CreateSLAEvents.php
│   │   │   │   ├── 008_CreateFeedback.php
│   │   │   │   └── 009_CreateAuditLogs.php
│   │   │   │
│   │   │   └── Seeds/
│   │   │       ├── UserSeeder.php
│   │   │       ├── UnitSeeder.php
│   │   │       └── ComplaintSeeder.php
│   │   │
│   │   └── Helpers/
│   │       └── api_helper.php
│   │
│   ├── public/
│   │   └── index.php
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── feature/
│   │
│   ├── writable/
│   ├── spark
│   ├── composer.json
│   └── composer.lock
│
│
├── ml/
│   │
│   ├── data/
│   │   │
│   │   ├── raw/
│   │   │   ├── complaints/
│   │   │   │   ├── complaints_2026-08.jsonl
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── external/
│   │   │
│   │   ├── interim/
│   │   │   ├── cleaned.parquet
│   │   │   └── normalized.parquet
│   │   │
│   │   └── processed/
│   │       ├── train.parquet
│   │       ├── validation.parquet
│   │       ├── test.parquet
│   │       └── embeddings.parquet
│   │
│   ├── models/
│   │   ├── type_classifier/
│   │   ├── service_classifier/
│   │   ├── issue_classifier/
│   │   └── sentiment_classifier/
│   │
│   ├── notebooks/
│   │   ├── 01_eda.ipynb
│   │   ├── 02_preprocessing.ipynb
│   │   ├── 03_type_classification.ipynb
│   │   ├── 04_service_classification.ipynb
│   │   ├── 05_issue_classification.ipynb
│   │   ├── 06_sentiment.ipynb
│   │   ├── 07_embeddings.ipynb
│   │   ├── 08_clustering.ipynb
│   │   └── 09_anomaly_detection.ipynb
│   │
│   ├── src/
│   │   │
│   │   ├── config/
│   │   │   ├── settings.py
│   │   │   └── labels.py
│   │   │
│   │   ├── data/
│   │   │   ├── loader.py
│   │   │   ├── converter.py
│   │   │   ├── cleaner.py
│   │   │   ├── splitter.py
│   │   │   └── validator.py
│   │   │
│   │   ├── preprocessing/
│   │   │   ├── normalizer.py
│   │   │   ├── tokenizer.py
│   │   │   ├── stopwords.py
│   │   │   └── stemmer.py
│   │   │
│   │   ├── features/
│   │   │   ├── tfidf.py
│   │   │   └── embeddings.py
│   │   │
│   │   ├── models/
│   │   │   ├── base_classifier.py
│   │   │   ├── type_classifier.py
│   │   │   ├── service_classifier.py
│   │   │   ├── issue_classifier.py
│   │   │   ├── sentiment_classifier.py
│   │   │   ├── similarity.py
│   │   │   ├── clustering.py
│   │   │   └── anomaly.py
│   │   │
│   │   ├── training/
│   │   │   ├── train_type.py
│   │   │   ├── train_service.py
│   │   │   ├── train_issue.py
│   │   │   └── train_sentiment.py
│   │   │
│   │   ├── evaluation/
│   │   │   ├── metrics.py
│   │   │   ├── confusion_matrix.py
│   │   │   └── reports.py
│   │   │
│   │   ├── analytics/
│   │   │   ├── recurring.py
│   │   │   ├── trends.py
│   │   │   ├── anomaly.py
│   │   │   └── priority.py
│   │   │
│   │   └── api/
│   │       ├── main.py
│   │       ├── schemas.py
│   │       ├── dependencies.py
│   │       └── routes/
│   │           ├── predict.py
│   │           ├── sentiment.py
│   │           ├── similarity.py
│   │           └── health.py
│   │
│   ├── scripts/
│   │   ├── csv_to_jsonl.py
│   │   ├── jsonl_to_parquet.py
│   │   ├── preprocess.py
│   │   ├── train.py
│   │   └── evaluate.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
│
├── frontend/
│   │
│   ├── public/
│   │   └── assets/
│   │
│   ├── src/
│   │   ├── main.js
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Sidebar.js
│   │   │   ├── StatCard.js
│   │   │   ├── DataTable.js
│   │   │   ├── StatusBadge.js
│   │   │   └── ChartContainer.js
│   │   │
│   │   ├── pages/
│   │   │   ├── dashboard.js
│   │   │   ├── complaints.js
│   │   │   ├── complaint-detail.js
│   │   │   ├── analytics.js
│   │   │   ├── followups.js
│   │   │   ├── evidence.js
│   │   │   └── settings.js
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authApi.js
│   │   │   ├── complaintApi.js
│   │   │   ├── analyticsApi.js
│   │   │   └── followupApi.js
│   │   │
│   │   ├── charts/
│   │   │   ├── trend.js
│   │   │   ├── sentiment.js
│   │   │   ├── issue.js
│   │   │   ├── sla.js
│   │   │   └── unit.js
│   │   │
│   │   └── utils/
│   │       ├── formatter.js
│   │       ├── dates.js
│   │       └── permissions.js
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
│
├── database/
│   │
│   ├── schema/
│   │   ├── 001_users.sql
│   │   ├── 002_roles.sql
│   │   ├── 003_units.sql
│   │   ├── 004_complaints.sql
│   │   ├── 005_labels.sql
│   │   ├── 006_followups.sql
│   │   ├── 007_sla.sql
│   │   ├── 008_feedback.sql
│   │   └── 009_audit_logs.sql
│   │
│   └── seed/
│       ├── dummy_complaints.csv
│       └── dummy_users.csv
│
│
├── mlflow/
│   └── artifacts/
│
│
├── docs/
│   ├── architecture.md
│   ├── data_dictionary.md
│   ├── data_collection.md
│   ├── annotation_guideline.md
│   ├── ml_methodology.md
│   ├── api.md
│   ├── security.md
│   └── deployment.md
│
│
└── scripts/
    ├── setup.sh
    ├── seed.sh
    ├── train.sh
    └── deploy.sh
```