"""
AcadAI — Flask REST API
Endpoints for auth, students, predictions (ML), and real-time updates.
"""

import os
import sys
import json
import time
import logging
import threading
from functools import wraps
from datetime import datetime, timedelta

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Add project root to path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

load_dotenv(os.path.join(ROOT, ".env"))

from ml.model import get_registry, retrain_from_firebase
from backend.firebase_db import (
    init_firebase, get_all_teachers, get_teacher_by_email, create_teacher, update_teacher,
    get_all_students, get_student_by_id, get_student_by_roll, create_student, update_student, delete_student,
    save_prediction, get_prediction, get_all_predictions, get_student_records,
    attach_realtime_listener
)

# ─────────────────────────────────────────────────────────────
#  APP SETUP
# ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(
    __name__,
    static_folder=os.path.join(ROOT, "frontend-new", "dist", "assets"),
    template_folder=os.path.join(ROOT, "frontend-new", "dist")
)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
CORS(app, origins="*")

# ── Init Firebase ────────────────────────────────────────────
firebase_ok = init_firebase()

# ── Bootstrap ML model ──────────────────────────────────────
model_registry = get_registry()
logger.info(f"ML model ready. Trained on {model_registry.training_samples} samples.")

# ── Background retraining ────────────────────────────────────
def _bg_retrain():
    while True:
        time.sleep(int(os.getenv("MODEL_RETRAIN_INTERVAL", 3600)))
        try:
            from backend.firebase_db import _db
            if _db:
                retrain_from_firebase(_db)
        except Exception as e:
            logger.error(f"Background retrain error: {e}")

threading.Thread(target=_bg_retrain, daemon=True).start()

# ── Simple session store (replace with JWT / Redis in prod) ──
_sessions = {}   # token -> {userId, role, exp}

def _make_token(user_id, role):
    token = f"{user_id}_{int(time.time()*1000)}"
    _sessions[token] = {
        "userId": user_id,
        "role":   role,
        "exp":    time.time() + 86400   # 24 h
    }
    return token

def _get_session(token):
    s = _sessions.get(token)
    if s and s["exp"] > time.time():
        return s
    _sessions.pop(token, None)
    return None

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        sess  = _get_session(token)
        if not sess:
            return jsonify({"error": "Unauthorized"}), 401
        request.session = sess
        return f(*args, **kwargs)
    return wrapper

def require_teacher(f):
    @wraps(f)
    @require_auth
    def wrapper(*args, **kwargs):
        if request.session.get("role") != "teacher":
            return jsonify({"error": "Teacher access required"}), 403
        return f(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────────
#  SERVE REACT FRONTEND (production build)
# ─────────────────────────────────────────────────────────────
DIST = os.path.join(ROOT, "frontend-new", "dist")

@app.route("/")
def index():
    return send_from_directory(DIST, "index.html")

@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(os.path.join(DIST, "assets"), filename)

# Catch-all: return index.html for any non-API route (React client-side routing)
@app.route("/<path:path>")
def catch_all(path):
    if path.startswith("api/"):
        from flask import abort
        abort(404)
    return send_from_directory(DIST, "index.html")


# ─────────────────────────────────────────────────────────────
#  AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    role = body.get("role")

    if role == "teacher":
        email    = body.get("email", "").strip().lower()
        password = body.get("password", "")
        user     = get_teacher_by_email(email)
        if not user or user.get("password") != password:
            return jsonify({"error": "Invalid credentials"}), 401
    elif role == "student":
        roll     = body.get("rollNumber", "").strip()
        password = body.get("password", "")
        user     = get_student_by_roll(roll)
        if not user or user.get("password") != password:
            return jsonify({"error": "Invalid roll number or password"}), 401
    else:
        return jsonify({"error": "Invalid role"}), 400

    user["role"] = role
    token = _make_token(user["id"], role)
    safe  = {k: v for k, v in user.items() if k != "password"}
    return jsonify({"token": token, "user": safe})


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    body    = request.get_json() or {}
    name    = body.get("name", "").strip()
    email   = body.get("email", "").strip().lower()
    password= body.get("password", "")
    subject = body.get("subject", "").strip()

    if not all([name, email, password, subject]):
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password min 6 characters"}), 400
    if get_teacher_by_email(email):
        return jsonify({"error": "Email already registered"}), 409

    initials = "".join(w[0] for w in name.split() if w).upper()[:2]
    teacher  = create_teacher({
        "name": name, "email": email,
        "password": password, "subject": subject,
        "avatar": initials
    })
    token = _make_token(teacher["id"], "teacher")
    safe  = {k: v for k, v in teacher.items() if k != "password"}
    return jsonify({"token": token, "user": safe}), 201


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    _sessions.pop(token, None)
    return jsonify({"message": "Logged out"})


# ─────────────────────────────────────────────────────────────
#  STUDENT ENDPOINTS
# ─────────────────────────────────────────────────────────────
@app.route("/api/students", methods=["GET"])
@require_auth
def list_students():
    students = get_all_students()
    # Students can only see themselves
    if request.session["role"] == "student":
        students = [s for s in students if s["id"] == request.session["userId"]]
    safe = [{k: v for k, v in s.items() if k != "password"} for s in students]
    return jsonify(safe)


@app.route("/api/students", methods=["POST"])
@require_teacher
def add_student():
    body = request.get_json() or {}
    name = body.get("name", "").strip()
    if not name:
        return jsonify({"error": "Name required"}), 400
    if len(body.get("password", "")) < 4:
        return jsonify({"error": "Password min 4 chars"}), 400

    initials = "".join(w[0] for w in name.split() if w).upper()[:2]
    student  = create_student({
        "name":     name,
        "password": body["password"],
        "grade":    body.get("grade", "10th"),
        "avatar":   initials,
        "data":     body.get("data", {
            "attendance": 80, "studyHours": 3,
            "assignmentScore": 70, "participation": 70,
            "prevMarks": [70], "quizScores": [70],
            "subjects": {"Math":70,"Science":70,"English":70,"History":70,"CS":70}
        })
    })
    safe = {k: v for k, v in student.items() if k != "password"}
    return jsonify(safe), 201


@app.route("/api/students/<sid>", methods=["GET"])
@require_auth
def get_student(sid):
    # Students may only fetch their own record
    if request.session["role"] == "student" and request.session["userId"] != sid:
        return jsonify({"error": "Forbidden"}), 403
    st = get_student_by_id(sid)
    if not st:
        return jsonify({"error": "Not found"}), 404
    return jsonify({k: v for k, v in st.items() if k != "password"})


@app.route("/api/students/<sid>", methods=["PUT"])
@require_auth
def edit_student(sid):
    if request.session["role"] == "student" and request.session["userId"] != sid:
        return jsonify({"error": "Forbidden"}), 403
    body = request.get_json() or {}
    update_student(sid, body)
    st = get_student_by_id(sid)
    return jsonify({k: v for k, v in st.items() if k != "password"})


@app.route("/api/students/<sid>", methods=["DELETE"])
@require_teacher
def remove_student(sid):
    delete_student(sid)
    return jsonify({"message": "Deleted"})


# ─────────────────────────────────────────────────────────────
#  ML PREDICTION ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.route("/api/predict/<sid>", methods=["POST"])
@require_auth
def predict(sid):
    if request.session["role"] == "student" and request.session["userId"] != sid:
        return jsonify({"error": "Forbidden"}), 403

    st = get_student_by_id(sid)
    if not st:
        return jsonify({"error": "Student not found"}), 404

    body     = request.get_json() or {}
    features = body.get("features", st.get("data", {}))
    import numpy as np

    try:
        result = model_registry.predict(features)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500

    # AI narrative via Claude (optional — only if API key set)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            result["narrative"] = _claude_narrative(st, features, result, api_key)
        except Exception as e:
            logger.warning(f"Claude narrative failed: {e}")

    save_prediction(sid, result)
    return jsonify(result)


def _claude_narrative(student, features, result, api_key):
    import urllib.request
    prompt = (
        f"Student: {student.get('name')}\n"
        f"Predicted Mark: {result['predictedMark']}/100 Grade: {result['grade']}\n"
        f"Pass Probability: {result['passProbability']}%  Risk: {result['riskLevel']}\n"
        f"Attendance: {features.get('attendance')}%  Study: {features.get('studyHours')}h/day\n"
        f"Give a 3-sentence personalised academic coaching message. Be specific and encouraging."
    )
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    return data["content"][0]["text"]


# ─────────────────────────────────────────────────────────────
#  MODEL INFO ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.route("/api/model/info", methods=["GET"])
@require_auth
def model_info():
    reg = model_registry
    return jsonify({
        "bestModel":       getattr(reg, "best_name", "random_forest"),
        "metrics":         reg.metrics,
        "trainingSamples": reg.training_samples,
        "lastTrained":     reg.last_trained,
        "firebaseConnected": firebase_ok
    })


@app.route("/api/model/retrain", methods=["POST"])
@require_teacher
def manual_retrain():
    records = get_student_records()
    if len(records) < 5:
        return jsonify({"message": "Not enough records yet", "count": len(records)})
    import pandas as pd
    from ml.model import generate_synthetic_data
    df_real   = pd.DataFrame(records)
    df_synth  = generate_synthetic_data(max(0, 200 - len(df_real)))
    df        = pd.concat([df_real, df_synth], ignore_index=True)
    model_registry.train(df)
    return jsonify({"message": "Retrained", "samples": len(df), "metrics": model_registry.metrics})


# ─────────────────────────────────────────────────────────────
#  ANALYTICS ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.route("/api/analytics", methods=["GET"])
@require_teacher
def analytics():
    students    = get_all_students()
    predictions = get_all_predictions()
    pred_map    = {p["studentId"]: p for p in predictions if "studentId" in p}

    def last_mark(s):
        marks = s.get("data", {}).get("prevMarks", [0])
        return marks[-1] if marks else 0

    at_risk  = [s for s in students if s.get("data",{}).get("attendance",100) < 75
                or last_mark(s) < 60]
    avg_att  = (sum(s["data"]["attendance"] for s in students) / len(students)) if students else 0
    avg_mark = (sum(last_mark(s) for s in students) / len(students)) if students else 0

    return jsonify({
        "totalStudents": len(students),
        "atRisk":        len(at_risk),
        "avgAttendance": round(avg_att, 1),
        "avgMark":       round(avg_mark, 1),
        "predictionsRun": len(predictions),
        "modelMetrics":  model_registry.metrics
    })


# ─────────────────────────────────────────────────────────────
#  SSE — REAL-TIME UPDATES
# ─────────────────────────────────────────────────────────────
import queue as _queue
_sse_queues = []   # list of queue.Queue objects, one per connected client

def _broadcast(data: dict):
    msg = f"data: {json.dumps(data)}\n\n"
    dead = []
    for q in _sse_queues:
        try: q.put_nowait(msg)
        except: dead.append(q)
    for q in dead:
        try: _sse_queues.remove(q)
        except: pass

@app.route("/api/realtime/stream")
@require_auth
def sse_stream():
    from flask import Response, stream_with_context
    q = _queue.Queue(maxsize=50)
    _sse_queues.append(q)

    def generate():
        yield f"data: {json.dumps({'type':'connected','ts':time.time()})}\n\n"
        try:
            while True:
                try:
                    msg = q.get(timeout=25)
                    yield msg
                except _queue.Empty:
                    yield ": ping\n\n"   # keep-alive
        finally:
            try: _sse_queues.remove(q)
            except: pass

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


# Hook Firebase listener to broadcast SSE
def _on_firebase_change(event):
    _broadcast({"type": "students_updated", "ts": time.time(), "path": event.path})

attach_realtime_listener(_on_firebase_change)


# ─────────────────────────────────────────────────────────────
#  ERROR HANDLERS
# ─────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ─────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"AcadAI starting on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") == "development")
