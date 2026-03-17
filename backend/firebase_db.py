"""
AcadAI — Firebase Admin SDK wrapper
Handles all Firestore / RTDB interactions.
Falls back gracefully to in-memory store when Firebase is not configured.
"""

import os
import json
import uuid
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

_db  = None   # Firebase RTDB reference
_app = None   # Firebase App instance
_mem = {      # In-memory fallback store
    "teachers": {},
    "students": {},
    "predictions": {},
    "student_records": {}
}

# ── pre-seed in-memory store ──────────────────────────────────
def _seed_memory():
    _mem["teachers"]["t1"] = {
        "id": "t1", "name": "Dr. Sarah Mitchell",
        "email": "teacher@school.edu", "password": "teach123",
        "role": "teacher", "subject": "Mathematics & Science", "avatar": "SM"
    }
    students = [
        {"id":"s1","name":"Alex Johnson","password":"alex123","grade":"10th","avatar":"AJ",
         "data":{"attendance":88,"studyHours":3.5,"assignmentScore":76,"participation":72,
                 "prevMarks":[68,74,71,79],"quizScores":[70,75,68,82],
                 "subjects":{"Math":74,"Science":68,"English":82,"History":77,"CS":88}}},
        {"id":"s2","name":"Priya Sharma","password":"priya123","grade":"10th","avatar":"PS",
         "data":{"attendance":96,"studyHours":5.5,"assignmentScore":91,"participation":88,
                 "prevMarks":[85,89,87,92],"quizScores":[88,90,86,94],
                 "subjects":{"Math":92,"Science":89,"English":94,"History":88,"CS":91}}},
        {"id":"s3","name":"Marcus Williams","password":"marcus123","grade":"10th","avatar":"MW",
         "data":{"attendance":71,"studyHours":2.0,"assignmentScore":58,"participation":55,
                 "prevMarks":[52,48,61,55],"quizScores":[50,55,48,62],
                 "subjects":{"Math":54,"Science":48,"English":65,"History":60,"CS":58}}},
        {"id":"s4","name":"Yuki Tanaka","password":"yuki123","grade":"10th","avatar":"YT",
         "data":{"attendance":93,"studyHours":4.8,"assignmentScore":85,"participation":80,
                 "prevMarks":[80,83,86,88],"quizScores":[82,84,87,90],
                 "subjects":{"Math":88,"Science":85,"English":80,"History":83,"CS":90}}}
    ]
    for s in students:
        _mem["students"][s["id"]] = s

_seed_memory()


# ─────────────────────────────────────────────────────────────
#  INIT FIREBASE
# ─────────────────────────────────────────────────────────────
def init_firebase():
    global _db, _app
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        logger.warning("FIREBASE_PROJECT_ID not set — using in-memory store.")
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials, db as rtdb

        cred_dict = {
            "type": "service_account",
            "project_id":                project_id,
            "private_key_id":            os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
            "private_key":               os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "client_email":              os.getenv("FIREBASE_CLIENT_EMAIL", ""),
            "client_id":                 os.getenv("FIREBASE_CLIENT_ID", ""),
            "auth_uri":                  "https://accounts.google.com/o/oauth2/auth",
            "token_uri":                 "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cred_dict)
        _app = firebase_admin.initialize_app(cred, {
            "databaseURL": os.getenv("FIREBASE_DATABASE_URL", "")
        })
        _db = rtdb.reference("/")
        logger.info(f"Firebase connected to project: {project_id}")
        return True
    except Exception as e:
        logger.error(f"Firebase init failed: {e}. Falling back to in-memory store.")
        return False


def _is_firebase():
    return _db is not None


# ─────────────────────────────────────────────────────────────
#  TEACHERS
# ─────────────────────────────────────────────────────────────
def get_all_teachers():
    if _is_firebase():
        data = _db.child("teachers").get() or {}
        return list(data.values()) if isinstance(data, dict) else []
    return list(_mem["teachers"].values())

def get_teacher_by_email(email):
    teachers = get_all_teachers()
    return next((t for t in teachers if t.get("email", "").lower() == email.lower()), None)

def create_teacher(data: dict):
    tid = "t" + str(uuid.uuid4())[:8]
    data["id"] = tid
    data["role"] = "teacher"
    data["createdAt"] = datetime.utcnow().isoformat()
    if _is_firebase():
        _db.child("teachers").child(tid).set(data)
    else:
        _mem["teachers"][tid] = data
    return data

def update_teacher(tid: str, data: dict):
    if _is_firebase():
        _db.child("teachers").child(tid).update(data)
    else:
        if tid in _mem["teachers"]:
            _mem["teachers"][tid].update(data)


# ─────────────────────────────────────────────────────────────
#  STUDENTS
# ─────────────────────────────────────────────────────────────
def get_all_students():
    if _is_firebase():
        data = _db.child("students").get() or {}
        return list(data.values()) if isinstance(data, dict) else []
    return list(_mem["students"].values())

def get_student_by_id(sid: str):
    if _is_firebase():
        return _db.child("students").child(sid).get()
    return _mem["students"].get(sid)

def create_student(data: dict):
    sid = "s" + str(uuid.uuid4())[:8]
    data["id"] = sid
    data["role"] = "student"
    data["createdAt"] = datetime.utcnow().isoformat()
    if _is_firebase():
        _db.child("students").child(sid).set(data)
    else:
        _mem["students"][sid] = data
    return data

def update_student(sid: str, data: dict):
    if _is_firebase():
        _db.child("students").child(sid).update(data)
    else:
        if sid in _mem["students"]:
            _mem["students"][sid].update(data)

def delete_student(sid: str):
    if _is_firebase():
        _db.child("students").child(sid).delete()
    else:
        _mem["students"].pop(sid, None)


# ─────────────────────────────────────────────────────────────
#  PREDICTIONS
# ─────────────────────────────────────────────────────────────
def save_prediction(sid: str, result: dict):
    result["studentId"] = sid
    result["savedAt"]   = datetime.utcnow().isoformat()
    if _is_firebase():
        _db.child("predictions").child(sid).set(result)
    else:
        _mem["predictions"][sid] = result
    # Also push to student_records for ML retraining
    _push_student_record(sid, result)

def get_prediction(sid: str):
    if _is_firebase():
        return _db.child("predictions").child(sid).get()
    return _mem["predictions"].get(sid)

def get_all_predictions():
    if _is_firebase():
        data = _db.child("predictions").get() or {}
        return list(data.values()) if isinstance(data, dict) else []
    return list(_mem["predictions"].values())


# ─────────────────────────────────────────────────────────────
#  REAL-TIME STUDENT RECORDS (for ML retraining)
# ─────────────────────────────────────────────────────────────
def _push_student_record(sid: str, prediction: dict):
    """Stores flattened record so ML can retrain on real data."""
    st = get_student_by_id(sid)
    if not st:
        return
    d = st.get("data", {})
    import numpy as np
    record = {
        "studentId":        sid,
        "attendance":       d.get("attendance", 0),
        "study_hours":      d.get("studyHours", 0),
        "assignment_score": d.get("assignmentScore", 0),
        "participation":    d.get("participation", 0),
        "prev_avg":         float(np.mean(d.get("prevMarks", [0]))),
        "quiz_avg":         float(np.mean(d.get("quizScores", [0]))),
        "subject_avg":      float(np.mean(list(d.get("subjects", {"x": 0}).values()))),
        "final_mark":       prediction.get("predictedMark", 0),
        "timestamp":        time.time()
    }
    rid = "r" + str(uuid.uuid4())[:8]
    if _is_firebase():
        _db.child("student_records").child(rid).set(record)
    else:
        _mem["student_records"][rid] = record

def get_student_records():
    if _is_firebase():
        data = _db.child("student_records").get() or {}
        return list(data.values()) if isinstance(data, dict) else []
    return list(_mem["student_records"].values())


# ─────────────────────────────────────────────────────────────
#  REALTIME LISTENER (Firebase only)
# ─────────────────────────────────────────────────────────────
def attach_realtime_listener(callback):
    """Fires callback(event) whenever /students changes in Firebase."""
    if not _is_firebase():
        return
    try:
        _db.child("students").listen(callback)
        logger.info("Firebase real-time listener attached.")
    except Exception as e:
        logger.warning(f"Real-time listener failed: {e}")
