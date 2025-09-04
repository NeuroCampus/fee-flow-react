from django.core.management.base import BaseCommand
from backend.models import User, StudentProfile


class Command(BaseCommand):
    help = 'Create StudentProfiles for existing student users who don\'t have one'

    def handle(self, *args, **options):
        students_without_profiles = User.objects.filter(role='student').exclude(studentprofile__isnull=False)

        if not students_without_profiles.exists():
            self.stdout.write(
                self.style.SUCCESS('All student users already have StudentProfiles!')
            )
            return

        created_count = 0
        for user in students_without_profiles:
            StudentProfile.objects.create(
                user=user,
                name='',  # Will be filled later through profile update
                usn='',   # Will be filled later through profile update
                dept='',  # Will be filled later through profile update
                semester=1,  # Default semester
                admission_mode='kcet',  # Default admission mode
                status='active'  # Default status
            )
            created_count += 1
            self.stdout.write(
                f'Created StudentProfile for user: {user.email}'
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} StudentProfiles')
        )
