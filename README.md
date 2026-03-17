# 📚 AcadAI — ML-Powered Student Performance Predictor
### Full-stack Web App: Flask + Scikit-learn + Firebase + Real-time SSE

---

## 🗂 Project Structure

```
acadai-app/
├── backend/
│   ├── app.py           ← Flask REST API server
│   └── firebase_db.py   ← Firebase RTDB + in-memory fallback
├── frontend/
│   ├── templates/
│   │   └── index.html   ← Single-page app shell
│   └── static/
│       ├── css/app.css
│       └── js/
│           ├── api.js    ← Fetch wrapper for all API calls
│           ├── ui.js     ← Helpers: toast, modal, charts, SSE
│           ├── pages.js  ← All page renderers
│           ├── charts.js ← Chart utilities
│           └── app.js    ← Bootstrap + routing
├── ml/
│   └── model.py         ← Random Forest + Gradient Boost + Ridge ensemble
│   └── models/          ← Saved .pkl files (auto-generated on first run)
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚡ Quick Start (5 minutes)

### 1. Install Python dependencies

```bash
cd acadai-app
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY
# Firebase config is optional (app works without it)
```

### 3. Run the server

```bash
python backend/app.py
```

Open **http://localhost:5000** in your browser.

---

## 🔐 Default Login Credentials

| Role    | Email / ID        | Password  |
|---------|-------------------|-----------|
| Teacher | teacher@school.edu | teach123  |
| Student | Alex Johnson       | alex123   |
| Student | Priya Sharma       | priya123  |
| Student | Marcus Williams    | marcus123 |
| Student | Yuki Tanaka        | yuki123   |

Teachers can **sign up** for new accounts from the login page.

---

## 🧠 ML Models

The prediction engine trains **three models** and combines them as a weighted ensemble:

| Model             | Weight | Strength                        |
|-------------------|--------|---------------------------------|
| Random Forest     | 45%    | Handles non-linear patterns     |
| Gradient Boosting | 40%    | Best accuracy on tabular data   |
| Ridge Regression  | 15%    | Stable linear baseline          |

### Features used
- Attendance, Study Hours, Assignment Score, Participation
- Previous exam average, Quiz average, Subject average
- Engineered: Study×Attendance, Consistency Score, Study²

### Auto-retraining
- **On startup**: trains on 400 synthetic samples
- **Hourly**: retrains if Firebase has ≥10 real student records
- **Manual**: Teacher → ML Analytics → "Retrain Model" button
- Models saved as `.pkl` and reloaded on restart

---

## 🔥 Firebase Setup (optional but recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable **Realtime Database**
3. Go to **Project Settings → Service Accounts → Generate New Private Key**
4. Fill in `.env` with the downloaded credentials
5. Set database rules (for development):
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Without Firebase**, all data is stored in-memory (resets on restart).

---

## 🌐 Real-time Features

- **SSE (Server-Sent Events)** at `/api/realtime/stream`
- Green pulsing dot in sidebar = connected
- When Firebase data changes → all connected browsers auto-refresh
- Each prediction is saved to Firebase → triggers model retraining

---

## 🚀 Production Deployment

### Heroku
```bash
echo "web: gunicorn backend.app:app" > Procfile
git init && heroku create
git push heroku main
```

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "backend.app:app"]
```

### Environment variables for production
```
FLASK_ENV=production
SECRET_KEY=<strong-random-key>
FIREBASE_PROJECT_ID=<your-project>
# ... all other Firebase keys
```

---

## 🔌 API Reference

| Method | Endpoint               | Auth     | Description            |
|--------|------------------------|----------|------------------------|
| POST   | /api/auth/login        | —        | Login                  |
| POST   | /api/auth/signup       | —        | Teacher registration   |
| POST   | /api/auth/logout       | Bearer   | Logout                 |
| GET    | /api/students          | Bearer   | List all students      |
| POST   | /api/students          | Teacher  | Add student            |
| GET    | /api/students/:id      | Bearer   | Get student            |
| PUT    | /api/students/:id      | Bearer   | Update student         |
| DELETE | /api/students/:id      | Teacher  | Delete student         |
| POST   | /api/predict/:sid      | Bearer   | Run ML prediction      |
| GET    | /api/model/info        | Bearer   | Model metrics          |
| POST   | /api/model/retrain     | Teacher  | Manual retrain         |
| GET    | /api/analytics         | Teacher  | Class analytics        |
| GET    | /api/realtime/stream   | Bearer   | SSE real-time stream   |

---

## ✨ Features Summary

- ✅ Random Forest + Gradient Boosting + Ridge ensemble ML
- ✅ Feature importance visualization
- ✅ Firebase Realtime Database integration
- ✅ Fallback in-memory store (no Firebase needed to run)
- ✅ Real-time SSE push updates
- ✅ Teacher signup + student management (add/edit/delete)
- ✅ Auto-retraining from Firebase data
- ✅ Claude AI narrative (set ANTHROPIC_API_KEY in .env)
- ✅ REST API with Bearer token auth
- ✅ Production-ready with Gunicorn
