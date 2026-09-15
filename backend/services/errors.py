from fastapi import HTTPException


def handle_service_error(error: Exception):
    return HTTPException(
        status_code=500,
        detail=f"SupportIQ service error: {str(error)}"
    )
