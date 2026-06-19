from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.user import (
    MicrosoftLogin,
    TokenResponse,
    UserCreate,
    UserLogin,
    RegisterOtpRequest,
    VerifyLoginOtpRequest,
    LoginResponse,
)
from app.services.auth_service import AuthService
from app.utils.response import success_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register/request-otp", summary="Send an OTP for registration")
async def request_register_otp(data: RegisterOtpRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.send_registration_otp(data)
    return success_response(
        data=result,
        message="OTP sent successfully",
    )


@router.post("/signup", summary="Register a new user")
async def signup(data: UserCreate, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.signup(data)
    return success_response(
        data=TokenResponse.model_validate(result).model_dump(),
        message="User registered successfully",
    )


@router.post("/login", summary="Login and receive OTP verification request")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.login(data)
    return success_response(
        data=LoginResponse.model_validate(result).model_dump(),
        message="OTP sent to your email",
    )


@router.post("/login/verify-otp", summary="Verify OTP and complete login")
async def verify_login_otp(data: VerifyLoginOtpRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.verify_login_otp(data)
    return success_response(
        data=TokenResponse.model_validate(result).model_dump(),
        message="Login successful",
    )


@router.post("/microsoft", summary="Login with Microsoft (MSAL id token)")
async def microsoft_login(data: MicrosoftLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.microsoft_login(data)
    return success_response(
        data=TokenResponse.model_validate(result).model_dump(),
        message="Microsoft login successful",
    )
