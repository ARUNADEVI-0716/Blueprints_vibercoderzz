# Nexus — Credit-Vision: Inclusive Scoring & Trust Protocols

> Real-time alternative credit scoring engine for the financially invisible.

Nexus fuses XGBoost ML predictions with bureau data and alternative financial
signals (bank transactions, rent history, utility payments, employment type)
to generate a Holistic Risk Score — with full explainability and built-in
bias auditing. Built for the Credit-Vision hackathon challenge.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| ML Service | Python, FastAPI, XGBoost, Scikit-learn |
| Bank Connectivity | Plaid API (sandbox) |
| Payments | Stripe (test mode) |
| Email | Resend |

---

## Project Structure
```
Blueprints_vibe/
│
├── src/                             # React + Vite frontend (root level)
│   ├── components/
│   │   ├── NexusChat.tsx            # AI chatbot assistant
│   │   ├── FraudAlertPanel.tsx      # Fraud risk display
│   │   ├── AuthPanel.tsx            # Auth left panel
│   │   ├── Skeleton.tsx             # Loading skeletons
│   │   └── ProtectedRoute.tsx       # Route guard
│   ├── context/
│   │   └── AuthContext.tsx          # Global auth state
│   ├── lib/
│   │   └── supabaseClient.ts        # Supabase client init
│   ├── pages/
│   │   ├── applicant/
│   │   │   ├── ApplicantDashboard.tsx
│   │   │   ├── ConnectBankPage.tsx
│   │   │   ├── CreditScorePage.tsx
│   │   │   ├── LoanApplicationPage.tsx
│   │   │   ├── LoanStatusPage.tsx
│   │   │   ├── DocumentUploadPage.tsx
│   │   │   ├── AgreementPage.tsx
│   │   │   └── RepaymentPage.tsx
│   │   └── officer/
│   │       ├── OfficerDashboard.tsx
│   │       ├── ApplicationReview.tsx
│   │       ├── OfficerLogin.tsx
│   │       ├── OfficerTOTPSetup.tsx
│   │       └── OfficerTOTPVerify.tsx
│   └── App.tsx
│
├── backend/                         # Node.js + Express API
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── credit.ts
│   │   │   ├── plaid.ts
│   │   │   ├── stripe.ts
│   │   │   ├── fraud.ts
│   │   │   ├── officer.ts
│   │   │   ├── agreement.ts
│   │   │   ├── guarantorOtp.ts
│   │   │   └── repayment.ts
│   │   ├── services/
│   │   │   ├── creditEngine.ts
│   │   │   ├── bureauEngine.ts
│   │   │   ├── fraudEngine.ts
│   │   │   ├── plaidService.ts
│   │   │   ├── stripeService.ts
│   │   │   └── emailService.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ml/                              # Python FastAPI ML service
│   ├── main.py                      # Original FastAPI server
│   ├── main_v2.py                   # Updated server with bureau fusion
│   ├── train.py                     # Original training script
│   ├── train_v2.py                  # Updated training with real datasets
│   ├── requirements.txt
│   ├── features.json                # Feature name list
│   ├── model.json                   # XGBoost model (generated)
│   ├── scaler.pkl                   # Feature scaler (generated)
│   └── bias_report.json             # Fairness audit report (generated)
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```
---

## Prerequisites

- Node.js 18+
- Python 3.10+
- npm
- Supabase project
- Plaid developer account (sandbox)
- Stripe account (test mode)
- Resend account

---

## Environment Variables

### Frontend — `frontend/.env`
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

### Backend — `backend/.env`
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret

STRIPE_SECRET_KEY=your_stripe_secret_key

RESEND_API_KEY=your_resend_api_key

OFFICER_EMAIL=officer@yourdomain.com
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
PORT=3001
```

---
## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run:
```sql
create table loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  full_name text, email text, amount numeric,
  tenure integer, purpose text, employment_type text,
  monthly_income numeric, pan_number text, aadhaar_number text,
  guarantor_name text, guarantor_mobile text,
  guarantor_otp_verified boolean default false,
  guarantor_verified_at timestamptz,
  agreement_signed boolean default false,
  agreement_signed_at timestamptz, agreement_ip text,
  status text default 'draft',
  officer_id text, officer_notes text,
  fraud_risk_score numeric, fraud_risk_level text,
  fraud_flags jsonb, fraud_blocked boolean default false,
  fraud_checked_at timestamptz,
  stripe_payment_id text, stripe_payout_status text,
  repaid_on_time boolean, repaid_at timestamptz,
  score_breakdown jsonb, approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table credit_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  score numeric, grade text, is_cold_start boolean,
  breakdown jsonb,
  calculated_at timestamptz default now()
);

create table plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  access_token text, item_id text, institution_name text,
  created_at timestamptz default now()
);

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  plaid_item_id uuid references plaid_items,
  account_id text, name text, balance numeric, account_type text
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  account_id text, transaction_id text unique,
  amount numeric, date date, merchant text, category text
);

create table loan_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  application_id uuid references loan_applications,
  doc_type text, file_path text,
  verified boolean default false,
  verified_by text, verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create table emi_payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references loan_applications,
  user_id uuid references auth.users,
  emi_number integer, amount numeric, annual_rate numeric,
  due_date date, paid_at timestamptz,
  late boolean default false, stripe_payment_id text
);

create table guarantor_otp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  application_id uuid, mobile text,
  otp_sent_at timestamptz default now()
);
```

3. Enable Row Level Security on all tables
4. Create a storage bucket named `loan-documents` — set to **private**

---

## Installation & Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/ARUNADEVI-0716/Blueprints_vibe.git
cd Blueprints_vibe
```

### 2. ML Service
```bash
cd ml
pip install -r requirements.txt
```

Train the model (do this once before starting the server):
```bash
# Optional: place cs-training.csv (Kaggle Give Me Some Credit)
# and german.data (UCI German Credit) in the ml/ folder
# for real-dataset training. Otherwise the script uses a
# calibrated fallback automatically.

python train_v2.py
```

Start the ML server:
```bash
uvicorn main_v2:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Backend
```bash
cd backend
npm install
# create backend/.env and fill in values
npm run dev
```

### 4. Frontend
```bash
npm install
# create frontend/.env and fill in values
npm run dev
```

### 5. Open the app
```
http://localhost:5173
```

---

## Running All Three Together

Open three terminal windows:
```bash
# Terminal 1
cd ml && uvicorn main_v2:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2
cd backend && npm run dev

# Terminal 3
npm run dev
```

---

## Officer Portal

URL: `/officer/login`

- Set `OFFICER_EMAIL` in `backend/.env`
- Officer must complete TOTP 2FA setup at `/officer/setup-2fa` on first login
- Use Google Authenticator or Authy to scan the QR code

---

## ML Service API

| Endpoint | Method | Description |
|---|---|---|
| `/predict` | POST | XGBoost + bureau fusion credit score |
| `/bureau-fuse` | POST | Bureau fusion without ML model |
| `/health` | GET | Service health + bias report summary |
| `/bias-report` | GET | Full training fairness audit |
| `/feature-importance` | GET | XGBoost feature weights |

---

## Key Features

- **Alternative Credit Scoring** — 13 features engineered from 90 days of bank transactions
- **Bureau Fusion** — Dynamic weighting between CIBIL-style bureau score and alternative signals. When no bureau record exists, 100% weight shifts to alternative signals
- **Cold Start Handling** — First-time borrowers are scored purely on rent payments, utility history, transaction consistency, and employment type
- **Explainability** — Every score returns a factor-by-factor breakdown with impact labels and contribution weights
- **Bias Auditing** — Fairness audit across income groups, employment stability, and cold-start applicants on every model training run
- **Fraud Detection** — PAN/Aadhaar validation, duplicate identity checks, income mismatch detection, transaction anomaly analysis
- **Officer Dashboard** — Full application review with fraud report, document verification, approve/reject controls
- **Digital Agreement** — OTP-signed loan agreement with IP logging
- **EMI Repayment** — Full repayment schedule with reducing balance EMI calculation and automatic credit score boost on completion
- **Guarantor Verification** — OTP verification flow for guarantor mobile number

---





