from fastapi import HTTPException, status


class AppError(HTTPException):
    """Base application error."""
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", status.HTTP_404_NOT_FOUND)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(detail, status.HTTP_403_FORBIDDEN)


class ConflictError(AppError):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail, status.HTTP_409_CONFLICT)


class ValidationError(AppError):
    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_422_UNPROCESSABLE_ENTITY)


class TenantIsolationError(ForbiddenError):
    def __init__(self):
        super().__init__("Cross-tenant access denied")


class TokenExpiredError(UnauthorizedError):
    def __init__(self):
        super().__init__("Token has expired")


class TokenRevokedError(UnauthorizedError):
    def __init__(self):
        super().__init__("Token has been revoked")
