"""
IntelliAttend Signals

post_save on Student:
  - When a student is created or their course changes, automatically enroll
    them in every Subject that belongs to their assigned Course.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger('intelliattend')


@receiver(post_save, sender='api.Student')
def auto_enroll_student_in_course_subjects(sender, instance, created, **kwargs):
    """
    Automatically enrol (or re-enrol after a course change) a student in all
    Subjects that belong to their current Course.

    Logic:
      • On first creation   → enrol in every Subject with course == student.course
      • On subsequent saves → enrol in any NEW subjects not yet in their enrollments
        (handles the case where a teacher adds a new subject to the course later)

    Uses bulk_create with ignore_conflicts=True so it's idempotent and safe.
    """
    from .models import Subject, SubjectEnrollment  # local import avoids circular

    if not instance.course_id:
        return  # No course assigned yet — nothing to do

    # Fetch all subjects for this student's course
    subjects = Subject.objects.filter(course_id=instance.course_id)

    if not subjects.exists():
        logger.info(
            "auto_enroll: No subjects found for course_id=%s (student=%s)",
            instance.course_id, instance.student_id
        )
        return

    # Build enrollment objects for subjects not yet enrolled
    existing_subject_ids = set(
        SubjectEnrollment.objects.filter(student=instance).values_list('subject_id', flat=True)
    )

    new_enrollments = [
        SubjectEnrollment(student=instance, subject=subj)
        for subj in subjects
        if subj.id not in existing_subject_ids
    ]

    if new_enrollments:
        SubjectEnrollment.objects.bulk_create(new_enrollments, ignore_conflicts=True)
        logger.info(
            "auto_enroll: Enrolled student %s in %d subject(s) for course_id=%s",
            instance.student_id, len(new_enrollments), instance.course_id
        )
    else:
        logger.debug(
            "auto_enroll: Student %s already enrolled in all subjects for course_id=%s",
            instance.student_id, instance.course_id
        )
