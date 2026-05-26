"""
IntelliAttend API Permissions
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsTeacher(BasePermission):
    """Only teacher users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'teacher'


class IsStudent(BasePermission):
    """Only student users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsAdminOrTeacher(BasePermission):
    """Admin or teacher users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'teacher']


class IsAdminOrReadOnly(BasePermission):
    """Admin can write, anyone can read."""
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.is_authenticated and request.user.role == 'admin'
