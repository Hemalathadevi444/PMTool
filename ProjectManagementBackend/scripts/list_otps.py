import asyncio
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OTPVerification))
        rows = result.scalars().all()
        print(f"Total OTP rows: {len(rows)}")
        for r in rows:
            print(f"Email: {r.email} | OTP: {r.otp} | Purpose: {r.purpose} | Created: {r.created_at}")

if __name__ == "__main__":
    asyncio.run(main())
