#!/usr/bin/env python
"""
Simple Student Sync Script
This script shows how to query students from PostgreSQL and sync to Fees app
Run this from your Campus app directory with proper Django setup
"""

import psycopg2
import requests
import json
from datetime import datetime

# PostgreSQL connection details (from your .env)
DB_CONFIG = {
    'dbname': 'attendance_db',
    'user': 'postgres',
    'password': 'Macbook@a2141',
    'host': 'localhost',
    'port': '5432'
}

FEES_APP_URL = 'http://127.0.0.1:8001'

def get_students_from_postgresql():
    """
    Query students directly from PostgreSQL
    """
    print("Connecting to PostgreSQL database...")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Query students with related data
        query = """
        SELECT
            s.usn,
            s.name,
            b.name as batch_name,
            br.name as branch_name,
            sem.number as semester_number,
            sec.name as section_name,
            s.date_of_admission,
            s.is_active
        FROM api_student s
        LEFT JOIN api_batch b ON s.batch_id = b.id
        LEFT JOIN api_branch br ON s.branch_id = br.id
        LEFT JOIN api_semester sem ON s.semester_id = sem.id
        LEFT JOIN api_section sec ON s.section_id = sec.id
        WHERE s.is_active = true
        ORDER BY s.usn
        """

        cursor.execute(query)
        students = cursor.fetchall()

        print(f"Found {len(students)} active students in PostgreSQL")

        # Convert to list of dicts
        student_list = []
        for row in students:
            student_list.append({
                'usn': row[0],
                'name': row[1],
                'batch': row[2] or '',
                'branch': row[3] or '',
                'semester': row[4] or 1,
                'section': row[5] or '',
                'date_of_admission': row[6].isoformat() if row[6] else None,
                'is_active': row[7]
            })

        cursor.close()
        conn.close()

        return student_list

    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return []

def sync_student_to_fees(student_data):
    """
    Send student data to Fees app sync API
    """
    print(f"Sending data: {student_data}")
    try:
        response = requests.post(
            f"{FEES_APP_URL}/api/sync-student/",
            json=student_data,
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Synced {student_data['usn']}: {result['message']}")
            return True
        else:
            print(f"❌ Failed to sync {student_data['usn']}: HTTP {response.status_code}")
            return False

    except requests.RequestException as e:
        print(f"❌ Network error syncing {student_data['usn']}: {e}")
        return False

def main():
    """
    Main sync function
    """
    print("Starting student sync from PostgreSQL to Fees app...")
    print(f"PostgreSQL DB: {DB_CONFIG['dbname']}")
    print(f"Fees app URL: {FEES_APP_URL}")
    print("-" * 60)

    # Get students from PostgreSQL
    students = get_students_from_postgresql()

    if not students:
        print("No students found to sync!")
        return

    # Display sample students
    print(f"Sample students from PostgreSQL:")
    for i, student in enumerate(students[:3]):  # Show first 3
        print(f"  {i+1}. {student['name']} ({student['usn']}) - {student['branch']} Sem {student['semester']}")
    print("  ...")

    # Ask user to continue
    # confirm = input(f"\nFound {len(students)} students. Proceed with sync? (y/N): ")
    # if confirm.lower() != 'y':
    #     print("Sync cancelled.")
    #     return
    
    # Auto-proceed for testing
    print(f"\nAuto-proceeding with sync of {len(students)} students...")

    # Sync each student
    synced_count = 0
    failed_count = 0

    print("\nStarting sync...")
    for student in students:
        print(f"Syncing: {student['name']} ({student['usn']})")
        if sync_student_to_fees(student):
            synced_count += 1
        else:
            failed_count += 1

    print("-" * 60)
    print("Sync completed!")
    print(f"✅ Successfully synced: {synced_count} students")
    print(f"❌ Failed to sync: {failed_count} students")

if __name__ == '__main__':
    main()