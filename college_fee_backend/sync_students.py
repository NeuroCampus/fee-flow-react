#!/usr/bin/env python
"""
Student Sync Script
Syncs students from Campus PostgreSQL database to Fees SQLite database
"""

import os
import sys
import django
import requests
from datetime import datetime

# Add the Campus app path to sys.path (update this path)
CAMPUS_APP_PATH = '/path/to/your/campus/app'  # Update this to your Campus app directory
sys.path.insert(0, CAMPUS_APP_PATH)

# Setup Django for Campus app
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_campus_app.settings')  # Update to your settings module
django.setup()

# Import Campus Student model
from your_campus_app.models import Student  # Update to your actual model import

# Fees app URL
FEES_APP_URL = 'http://localhost:8001'

def get_students_from_postgresql():
    """
    Query all active students from PostgreSQL database
    """
    print("Fetching students from PostgreSQL database...")

    # Get all active students
    students = Student.objects.filter(is_active=True).select_related(
        'batch', 'branch', 'semester', 'section'
    )

    print(f"Found {students.count()} active students")
    return students

def sync_student_to_fees(student):
    """
    Sync individual student to Fees app
    """
    data = {
        'usn': student.usn,
        'name': student.name,
        'branch': student.branch.name if student.branch else '',
        'batch': student.batch.name if student.batch else '',
        'semester': student.semester.number if student.semester else 1,
        'section': student.section.name if student.section else '',
        'date_of_admission': student.date_of_admission.isoformat() if student.date_of_admission else None,
        'is_active': student.is_active,
    }

    try:
        response = requests.post(
            f"{FEES_APP_URL}/api/sync-student/",
            json=data,
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        print(f"✅ Synced {student.usn}: {result}")
        return True
    except requests.RequestException as e:
        print(f"❌ Failed to sync {student.usn}: {e}")
        return False

def main():
    """
    Main sync function
    """
    print("Starting student sync from PostgreSQL to Fees app...")
    print(f"Fees app URL: {FEES_APP_URL}")
    print("-" * 50)

    # Get students from PostgreSQL
    students = get_students_from_postgresql()

    if not students:
        print("No students found to sync!")
        return

    # Sync each student
    synced_count = 0
    failed_count = 0

    for student in students:
        print(f"Syncing student: {student.name} ({student.usn})")
        if sync_student_to_fees(student):
            synced_count += 1
        else:
            failed_count += 1

    print("-" * 50)
    print(f"Sync completed!")
    print(f"✅ Successfully synced: {synced_count} students")
    print(f"❌ Failed to sync: {failed_count} students")

if __name__ == '__main__':
    main()