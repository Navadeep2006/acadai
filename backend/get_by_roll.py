def get_student_by_roll(roll: str):
    """Look up a student by rollNumber."""
    students = get_all_students()
    return next((s for s in students if str(s.get("rollNumber", "")) == str(roll)), None)
