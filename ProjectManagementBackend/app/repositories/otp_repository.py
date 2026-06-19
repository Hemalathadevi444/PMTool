from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.otp_verification import OTPVerification

class OTPRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_otp(self, email: str, purpose: str) -> OTPVerification | None:
        result = await self.db.execute(
            select(OTPVerification)
            .where(
                OTPVerification.email == email,
                OTPVerification.purpose == purpose
            )
            .order_by(OTPVerification.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, otp_entry: OTPVerification) -> OTPVerification:
        self.db.add(otp_entry)
        await self.db.flush()
        await self.db.refresh(otp_entry)
        return otp_entry

    async def delete_otps_by_email(self, email: str, purpose: str) -> None:
        await self.db.execute(
            delete(OTPVerification).where(
                OTPVerification.email == email,
                OTPVerification.purpose == purpose
            )
        )
        await self.db.flush()


