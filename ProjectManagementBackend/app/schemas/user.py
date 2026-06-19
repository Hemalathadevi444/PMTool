from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str | None = Field(default=None, min_length=8, max_length=128)
    otp: str = Field(min_length=6, max_length=6)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str | None = None


class MicrosoftLogin(BaseModel):
    id_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterOtpRequest(BaseModel):
    email: EmailStr


class VerifyLoginOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginResponse(BaseModel):
    require_otp: bool
    email: EmailStr
    message: str
    otp: str | None = None


