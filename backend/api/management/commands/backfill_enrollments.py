"""
Management command: backfill_enrollments

Run once after deploying the auto-enroll signal to enroll every existing
student into all subjects that belong to their current course.

Usage:
    python manage.py backfill_enrollments
    python manage.py backfill_enrollments --dry-run
"""
from django.core.management.base import BaseCommand
from api.models import Student, Subject, SubjectEnrollment


class Command(BaseCommand):
    help = 'Backfill SubjectEnrollment rows for all existing students based on their course subjects.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be enrolled without writing to the database.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        total_created = 0

        students = Student.objects.select_related('course').filter(course__isnull=False)
        self.stdout.write(f"Processing {students.count()} students with an assigned course...\n")

        for student in students:
            subjects = Subject.objects.filter(course=student.course)
            if not subjects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        f"  [SKIP] {student.student_id} — no subjects in course '{student.course.name}'"
                    )
                )
                continue

            existing_ids = set(
                SubjectEnrollment.objects.filter(student=student).values_list('subject_id', flat=True)
            )
            new_enrollments = [
                SubjectEnrollment(student=student, subject=subj)
                for subj in subjects
                if subj.id not in existing_ids
            ]

            if not new_enrollments:
                self.stdout.write(f"  [OK]   {student.student_id} — already fully enrolled")
                continue

            subject_names = ', '.join(e.subject.name for e in new_enrollments)
            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [DRY]  {student.student_id} — would enroll in: {subject_names}"
                    )
                )
            else:
                SubjectEnrollment.objects.bulk_create(new_enrollments, ignore_conflicts=True)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [DONE] {student.student_id} — enrolled in: {subject_names}"
                    )
                )
            total_created += len(new_enrollments)

        if dry_run:
            self.stdout.write(f"\nDry run complete. Would create {total_created} enrollment(s).")
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\nBackfill complete. Created {total_created} enrollment(s).")
            )
