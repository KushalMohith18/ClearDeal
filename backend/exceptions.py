"""
ClearDeal Custom Exceptions and Error Handling
Industry-standard error handling for B2B SaaS applications
"""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from typing import Optional, Dict, Any
import logging
import traceback

logger = logging.getLogger(__name__)


# ============ ERROR CODES ============
class ErrorCode:
    """Standardized error codes for ClearDeal API"""
    # Authentication Errors (1xxx)
    AUTH_INVALID_CREDENTIALS = "AUTH_1001"
    AUTH_TOKEN_EXPIRED = "AUTH_1002"
    AUTH_TOKEN_INVALID = "AUTH_1003"
    AUTH_UNAUTHORIZED = "AUTH_1004"
    AUTH_EMAIL_EXISTS = "AUTH_1005"
    
    # Validation Errors (2xxx)
    VALIDATION_FAILED = "VAL_2001"
    VALIDATION_MISSING_FIELD = "VAL_2002"
    VALIDATION_INVALID_FORMAT = "VAL_2003"
    VALIDATION_OUT_OF_RANGE = "VAL_2004"
    
    # Resource Errors (3xxx)
    RESOURCE_NOT_FOUND = "RES_3001"
    RESOURCE_ALREADY_EXISTS = "RES_3002"
    RESOURCE_CONFLICT = "RES_3003"
    RESOURCE_LOCKED = "RES_3004"
    
    # Business Logic Errors (4xxx)
    BUSINESS_COMPANY_REQUIRED = "BIZ_4001"
    BUSINESS_PRICE_BAND_VIOLATION = "BIZ_4002"
    BUSINESS_DEAL_STATE_INVALID = "BIZ_4003"
    BUSINESS_APPROVAL_REQUIRED = "BIZ_4004"
    BUSINESS_PERMISSION_DENIED = "BIZ_4005"
    BUSINESS_VERIFICATION_REQUIRED = "BIZ_4006"
    BUSINESS_BUDGET_EXCEEDED = "BIZ_4007"
    
    # Database Errors (5xxx)
    DATABASE_ERROR = "DB_5001"
    DATABASE_CONNECTION_ERROR = "DB_5002"
    DATABASE_TIMEOUT = "DB_5003"
    
    # External Service Errors (6xxx)
    EXTERNAL_SERVICE_ERROR = "EXT_6001"
    EXTERNAL_GST_VERIFICATION_FAILED = "EXT_6002"
    EXTERNAL_BANK_VERIFICATION_FAILED = "EXT_6003"
    EXTERNAL_PAYMENT_FAILED = "EXT_6004"
    
    # Rate Limiting (7xxx)
    RATE_LIMIT_EXCEEDED = "RATE_7001"


# ============ CUSTOM EXCEPTIONS ============
class ClearDealException(HTTPException):
    """Base exception for all ClearDeal errors"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": message,
                "details": details or {}
            },
            headers=headers
        )


class AuthenticationError(ClearDealException):
    """Authentication related errors"""
    
    def __init__(
        self,
        error_code: str = ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            message=message,
            details=details,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(ClearDealException):
    """Authorization/Permission related errors"""
    
    def __init__(
        self,
        message: str = "You don't have permission to perform this action",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=ErrorCode.BUSINESS_PERMISSION_DENIED,
            message=message,
            details=details
        )


class ResourceNotFoundError(ClearDealException):
    """Resource not found errors"""
    
    def __init__(
        self,
        resource_type: str,
        resource_id: Optional[str] = None,
        message: Optional[str] = None
    ):
        default_message = f"{resource_type} not found"
        if resource_id:
            default_message = f"{resource_type} with ID '{resource_id}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message=message or default_message,
            details={"resource_type": resource_type, "resource_id": resource_id}
        )


class CustomValidationError(ClearDealException):
    """Validation errors"""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=ErrorCode.VALIDATION_FAILED,
            message=message,
            details=error_details
        )


class BusinessLogicError(ClearDealException):
    """Business logic violations"""
    
    def __init__(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=error_code,
            message=message,
            details=details
        )


class PriceBandViolationError(BusinessLogicError):
    """Price band violation for reps"""
    
    def __init__(
        self,
        offered_price: float,
        min_price: float,
        max_price: Optional[float] = None
    ):
        message = f"Offer of ₹{offered_price:,.0f} violates price band (min: ₹{min_price:,.0f})"
        if max_price:
            message += f" (max: ₹{max_price:,.0f})"
        super().__init__(
            error_code=ErrorCode.BUSINESS_PRICE_BAND_VIOLATION,
            message=message,
            details={
                "offered_price": offered_price,
                "min_price": min_price,
                "max_price": max_price
            }
        )


class DealStateError(BusinessLogicError):
    """Invalid deal state transition"""
    
    def __init__(
        self,
        current_state: str,
        required_states: list,
        action: str
    ):
        super().__init__(
            error_code=ErrorCode.BUSINESS_DEAL_STATE_INVALID,
            message=f"Cannot {action}. Deal is in '{current_state}' state. Required: {', '.join(required_states)}",
            details={
                "current_state": current_state,
                "required_states": required_states,
                "action": action
            }
        )


class CompanyRequiredError(BusinessLogicError):
    """Company setup required error"""
    
    def __init__(self, action: str = "perform this action"):
        super().__init__(
            error_code=ErrorCode.BUSINESS_COMPANY_REQUIRED,
            message=f"Please complete company registration before you can {action}",
            details={"action": action}
        )


class DatabaseError(ClearDealException):
    """Database operation errors"""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=ErrorCode.DATABASE_ERROR,
            message=message,
            details=details
        )


class ExternalServiceError(ClearDealException):
    """External service integration errors"""
    
    def __init__(
        self,
        service_name: str,
        message: str = "External service error",
        error_code: str = ErrorCode.EXTERNAL_SERVICE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        error_details["service"] = service_name
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code=error_code,
            message=message,
            details=error_details
        )


class RateLimitError(ClearDealException):
    """Rate limiting errors"""
    
    def __init__(
        self,
        retry_after: int = 60,
        message: str = "Too many requests. Please try again later."
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message=message,
            details={"retry_after_seconds": retry_after},
            headers={"Retry-After": str(retry_after)}
        )


# ============ ERROR RESPONSE HELPERS ============
def create_error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> JSONResponse:
    """Create a standardized error response"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details or {}
            }
        }
    )


# ============ EXCEPTION HANDLERS ============
async def cleardeal_exception_handler(request: Request, exc: ClearDealException):
    """Handle ClearDeal custom exceptions"""
    logger.warning(
        f"ClearDeal Exception: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        },
        headers=exc.headers
    )


async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    errors = []
    if hasattr(exc, 'errors'):
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error.get("loc", []))
            errors.append({
                "field": field,
                "message": error.get("msg", "Invalid value"),
                "type": error.get("type", "value_error")
            })
    
    logger.warning(
        f"Validation Error: {request.url.path}",
        extra={"errors": errors, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.VALIDATION_FAILED,
                "message": "Request validation failed",
                "details": {"validation_errors": errors}
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    error_id = str(hash(traceback.format_exc()))[:8]
    
    logger.error(
        f"Unhandled Exception [{error_id}]: {str(exc)}",
        extra={
            "error_id": error_id,
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {"error_id": error_id}
            }
        }
    )


# ============ UTILITY FUNCTIONS ============
def validate_uuid(value: str, field_name: str = "ID") -> str:
    """Validate UUID format"""
    import re
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    if not uuid_pattern.match(value):
        raise ValidationError(
            message=f"Invalid {field_name} format",
            field=field_name,
            details={"value": value, "expected_format": "UUID"}
        )
    return value


def validate_gst_number(gst: str) -> str:
    """Validate GST number format (Indian GST)"""
    import re
    # GST format: 2 digit state code + 10 char PAN + 1 entity code + Z + 1 check digit
    gst_pattern = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
    if not gst_pattern.match(gst.upper()):
        raise ValidationError(
            message="Invalid GST number format",
            field="gst_number",
            details={"value": gst, "expected_format": "15-character GST number (e.g., 36AABCU9603R1ZM)"}
        )
    return gst.upper()


def validate_phone_number(phone: str) -> str:
    """Validate Indian phone number"""
    import re
    # Remove any spaces or dashes
    cleaned = re.sub(r'[\s\-]', '', phone)
    # Check for valid Indian mobile number
    phone_pattern = re.compile(r'^(\+91)?[6-9][0-9]{9}$')
    if not phone_pattern.match(cleaned):
        raise ValidationError(
            message="Invalid phone number format",
            field="phone",
            details={"value": phone, "expected_format": "10-digit Indian mobile number"}
        )
    return cleaned


def validate_price_positive(price: float, field_name: str = "price") -> float:
    """Validate price is positive"""
    if price <= 0:
        raise ValidationError(
            message=f"{field_name} must be a positive number",
            field=field_name,
            details={"value": price, "constraint": "must be > 0"}
        )
    return price
