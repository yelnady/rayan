# Quickstart Guide: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Created**: 2026-03-02

## Prerequisites

- Node.js 20+ (for frontend)
- Python 3.11+ (for backend)
- Google Cloud account with billing enabled
- Google Cloud CLI (`gcloud`) installed and authenticated

## 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yelnady/rayan.git
cd rayan

```

## 2. Google Cloud Setup

### Create Project

```bash
# Set existing project as default (project already created)
gcloud config set project rayan-memory

# Enable billing (replace with your billing account ID)
gcloud billing projects link rayan-memory --billing-account=YOUR_BILLING_ACCOUNT

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  cloudbuild.googleapis.com
```

### Create Firestore Database

```bash
gcloud firestore databases create --location=us-central1
```

### Create Cloud Storage Bucket

```bash
gsutil mb -l us-central1 gs://rayan-media-$(gcloud config get-value project)

# Enable CORS
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://rayan-media-$(gcloud config get-value project)
```

### Setup Firebase Auth

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Add your Google Cloud project
3. Enable Authentication → Sign-in method → Google
4. Copy the Firebase config for the frontend

## 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

### Configure Environment

Edit `backend/.env`:

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT=rayan-memory
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Firebase (for token verification)
FIREBASE_PROJECT_ID=rayan-memory

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Add to `.env` file

### Create Service Account

```bash
# Create service account
gcloud iam service-accounts create rayan-backend \
  --display-name="Rayan Backend Service"

# Grant permissions
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:rayan-backend@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:rayan-backend@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:rayan-backend@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Download key
gcloud iam service-accounts keys create ./service-account.json \
  --iam-account=rayan-backend@$(gcloud config get-value project).iam.gserviceaccount.com
```

### Run Backend Locally

```bash
# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Backend available at http://localhost:8000
# WebSocket at ws://localhost:8000/ws/{userId}
# API docs at http://localhost:8000/docs
```

## 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configure Environment

Edit `frontend/.env.local`:

```env
# Backend URL
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Firebase Config
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=rayan-memory.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rayan-memory
VITE_FIREBASE_STORAGE_BUCKET=rayan-memory.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Run Frontend Locally

```bash
# Start development server
npm run dev

# Frontend available at http://localhost:5173
```

## 5. Deploy to Google Cloud

### Deploy Backend

```bash
cd backend

# Build and push container
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/rayan-backend

# Deploy to Cloud Run
gcloud run deploy rayan-backend \
  --image gcr.io/$(gcloud config get-value project)/rayan-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)" \
  --session-affinity \
  --memory 2Gi \
  --cpu 2
```

### Deploy Frontend

```bash
cd frontend

# Build production bundle
npm run build

# Create hosting bucket
gsutil mb -l us-central1 gs://rayan-frontend-$(gcloud config get-value project)

# Configure for static hosting
gsutil web set -m index.html -e index.html gs://rayan-frontend-$(gcloud config get-value project)

# Upload files
gsutil -m cp -r dist/* gs://rayan-frontend-$(gcloud config get-value project)/

# Make public
gsutil iam ch allUsers:objectViewer gs://rayan-frontend-$(gcloud config get-value project)
```

### Update Frontend Config

Update `VITE_API_URL` and `VITE_WS_URL` with your Cloud Run URL, rebuild and redeploy.

## 6. Verify Deployment

### Test Backend Health

```bash
curl https://rayan-backend-xxx-uc.a.run.app/health
# Should return: {"status": "healthy"}
```

### Test WebSocket

```bash
# Install wscat if needed
npm install -g wscat

# Connect
wscat -c wss://rayan-backend-xxx-uc.a.run.app/ws/test-user
```

### Access Frontend

Visit: `https://storage.googleapis.com/rayan-frontend-[project-id]/index.html`

Or set up Cloud CDN for a custom domain.

## 7. Development Workflow

### Run Full Stack Locally

Terminal 1 (Backend):
```bash
cd backend && uvicorn main:app --reload
```

Terminal 2 (Frontend):
```bash
cd frontend && npm run dev
```

### Run Tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

### Lint and Format

```bash
# Backend
cd backend && ruff check . && ruff format .

# Frontend
cd frontend && npm run lint && npm run format
```

## Common Issues

### WebSocket Connection Failed

- Ensure Cloud Run has session affinity enabled
- Check CORS configuration
- Verify authentication token is valid

### Gemini API Quota Exceeded

- Check quota in [Google Cloud Console](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas)
- Request quota increase if needed

### Firestore Permission Denied

- Verify security rules are deployed
- Check service account has `datastore.user` role
- Ensure user is authenticated

### 3D Performance Issues

- Enable hardware acceleration in browser
- Check WebGL support: [WebGL Report](https://webglreport.com/)
- Reduce `maxArtifacts` in settings for testing

## Next Steps

1. Run the demo script from `docs/demo-script.md`
2. Record 4-minute demo video
3. Take screenshot of Cloud Run console for deployment proof
4. Create architecture diagram
5. Submit to hackathon
