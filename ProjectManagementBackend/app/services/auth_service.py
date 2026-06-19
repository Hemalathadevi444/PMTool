import secrets
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.otp_verification import OTPVerification
from app.repositories.user_repository import UserRepository
from app.repositories.otp_repository import OTPRepository
from app.schemas.user import (
    MicrosoftLogin,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    RegisterOtpRequest,
    VerifyLoginOtpRequest,
    LoginResponse,
)
from app.utils.exceptions import AppException
from app.utils.microsoft_auth import _extract_email, verify_microsoft_id_token
from app.utils.security import create_access_token, get_password_hash, verify_password
from app.utils.email import send_email


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
        self.otp_repo = OTPRepository(db)

    async def send_registration_otp(self, data: RegisterOtpRequest) -> dict:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise AppException(status_code=400, message="Email already registered")

        otp = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # Clear any existing registration OTPs for this email
        await self.otp_repo.delete_otps_by_email(data.email, "registration")

        otp_entry = OTPVerification(
            email=data.email,
            otp=otp,
            purpose="registration",
            expires_at=expires_at,
        )
        await self.otp_repo.create(otp_entry)

        # Send the OTP to email
        send_email(
            to_email=data.email,
            subject="Your Registration OTP",
            body=f"Your OTP for registration is {otp}. It is valid for 5 minutes.",
        )

        return {"message": "OTP sent successfully", "otp": otp}

    async def signup(self, data: UserCreate) -> TokenResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise AppException(status_code=400, message="Email already registered")

        # Verify OTP
        otp_entry = await self.otp_repo.get_latest_otp(data.email, "registration")
        if not otp_entry:
            raise AppException(status_code=400, message="No OTP requested for this email")

        now = datetime.now(timezone.utc)
        expires_at = otp_entry.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            raise AppException(status_code=400, message="OTP has expired")

        if otp_entry.otp != data.otp:
            raise AppException(status_code=400, message="Invalid OTP")

        # OTP is valid, clear it
        await self.otp_repo.delete_otps_by_email(data.email, "registration")

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=get_password_hash(data.password or secrets.token_urlsafe(32)),
        )
        user = await self.user_repo.create(user)
        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def login(self, data: UserLogin) -> LoginResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise AppException(status_code=401, message="Invalid email")
        if not user.is_active:
            raise AppException(status_code=403, message="User account is inactive")

        otp = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # Clear any existing login OTPs for this email
        await self.otp_repo.delete_otps_by_email(data.email, "login")

        otp_entry = OTPVerification(
            email=data.email,
            otp=otp,
            purpose="login",
            expires_at=expires_at,
        )
        await self.otp_repo.create(otp_entry)

        # Send OTP
        send_email(
            to_email=data.email,
            subject="Your Login OTP",
            body=f"Your OTP for login is {otp}. It is valid for 5 minutes.",
        )

        return LoginResponse(
            require_otp=True,
            email=data.email,
            message="OTP sent to your email",
            otp=otp,
        )

    async def verify_login_otp(self, data: VerifyLoginOtpRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise AppException(status_code=404, message="User not found")
        if not user.is_active:
            raise AppException(status_code=403, message="User account is inactive")

        # Verify OTP
        otp_entry = await self.otp_repo.get_latest_otp(data.email, "login")
        if not otp_entry:
            raise AppException(status_code=400, message="No OTP requested for this email")

        now = datetime.now(timezone.utc)
        expires_at = otp_entry.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            raise AppException(status_code=400, message="OTP has expired")

        if otp_entry.otp != data.otp:
            raise AppException(status_code=400, message="Invalid OTP")

        # OTP is valid, clear it
        await self.otp_repo.delete_otps_by_email(data.email, "login")

        # Send successful login email
        send_email(
            to_email=data.email,
            subject="Successful login",
            body="Successful login",
        )

        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def microsoft_login(self, data: MicrosoftLogin) -> TokenResponse:
        payload = await verify_microsoft_id_token(data.id_token)
        email = _extract_email(payload)
        if not email:
            raise AppException(status_code=401, message="Microsoft account email not found in token")

        full_name = email.split("@", 1)[0]
        user = await self.user_repo.get_by_email(email)

        if not user:
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            )
            user = await self.user_repo.create(user)
        elif not user.is_active:
            raise AppException(status_code=403, message="User account is inactive")

        # Send successful login email for Microsoft login as well
        send_email(
            to_email=email,
            subject="Successful login",
            body="Successful login",
        )

        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )
