from app.models import User
from app.core.constants import UserRole


class RBACService:
    @staticmethod
    def can_edit_calculations(user: User) -> bool:
        """Check if user can edit calculations"""
        return user.role in [UserRole.MANAGER.value, UserRole.ANALYST.value]

    @staticmethod
    def can_view_reports(user: User) -> bool:
        """Check if user can view reports"""
        return user.role in [
            UserRole.ANALYST.value,
            UserRole.DIRECTOR.value,
            UserRole.MANAGER.value,
            UserRole.CHECKER.value
        ]

    @staticmethod
    def can_approve_calculations(user: User) -> bool:
        """Check if user can approve calculations"""
        return user.role in [UserRole.CHECKER.value, UserRole.DIRECTOR.value]

    @staticmethod
    def can_manage_tariffs(user: User) -> bool:
        """Check if user can manage tariffs"""
        return user.role == UserRole.ADMIN_NSI.value

    @staticmethod
    def can_manage_users(user: User) -> bool:
        """Check if user can manage users"""
        return user.role == UserRole.ADMIN_NSI.value

    @staticmethod
    def can_view_audit_logs(user: User) -> bool:
        """Check if user can view audit logs"""
        return user.role in [UserRole.CHECKER.value, UserRole.ADMIN_NSI.value, UserRole.DIRECTOR.value]

    @staticmethod
    def can_calculate(user: User) -> bool:
        """Check if user can perform calculations"""
        return user.role in [UserRole.MANAGER.value, UserRole.ANALYST.value, UserRole.DIRECTOR.value]

    @staticmethod
    def is_admin(user: User) -> bool:
        """Check if user is admin"""
        return user.role == UserRole.ADMIN_NSI.value

    @staticmethod
    def is_director(user: User) -> bool:
        """Check if user is director"""
        return user.role == UserRole.DIRECTOR.value

    @staticmethod
    def is_checker(user: User) -> bool:
        """Check if user is checker"""
        return user.role == UserRole.CHECKER.value

    @staticmethod
    def get_visible_calculations(user: User):
        """Get filter for visible calculations based on role"""
        if user.role == UserRole.DIRECTOR.value:
            # Director sees all calculations
            return {"visible_to_all": True}
        elif user.role == UserRole.CHECKER.value:
            # Checker sees all submitted calculations
            return {"status": "submitted"}
        elif user.role == UserRole.ANALYST.value:
            # Analyst sees all calculations
            return {"visible_to_all": True}
        else:
            # Manager sees only their own calculations
            return {"user_id": user.id}
