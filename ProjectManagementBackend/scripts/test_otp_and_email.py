import asyncio
import httpx
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification
from app.models.user import User

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "hema_test@aighospitals.com"
TEST_NAME = "Hema Test"
TEST_PASSWORD = "Password@123"

async def get_latest_otp(email: str, purpose: str) -> str:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OTPVerification)
            .where(OTPVerification.email == email, OTPVerification.purpose == purpose)
            .order_by(OTPVerification.created_at.desc())
            .limit(1)
        )
        entry = result.scalar_one_or_none()
        return entry.otp if entry else ""

async def cleanup_test_user():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == TEST_EMAIL)
        )
        user = result.scalar_one_or_none()
        if user:
            from sqlalchemy import delete
            await session.execute(delete(User).where(User.id == user.id))
            await session.commit()
            print(f"Cleaned up existing test user {TEST_EMAIL}")

async def run_tests():
    # Allow some time for backend server to start up
    await asyncio.sleep(2)
    
    async with httpx.AsyncClient() as client:
        print("\n--- Starting End-to-End Auth & Task Verification ---")
        
        # 1. Clean up existing test user
        await cleanup_test_user()

        # 2. Request Registration OTP
        print("\n[Step 1] Requesting Registration OTP...")
        resp = await client.post(f"{BASE_URL}/auth/register/request-otp", json={"email": TEST_EMAIL})
        print("Response:", resp.json())
        assert resp.status_code == 200, "Failed to request OTP"

        # 3. Retrieve Registration OTP from DB
        otp = await get_latest_otp(TEST_EMAIL, "registration")
        print(f"Retrieved Registration OTP from DB: {otp}")
        assert otp != "", "OTP not found in database"

        # 4. Sign Up
        print("\n[Step 2] Signing Up with OTP...")
        signup_data = {
            "email": TEST_EMAIL,
            "full_name": TEST_NAME,
            "password": TEST_PASSWORD,
            "otp": otp
        }
        resp = await client.post(f"{BASE_URL}/auth/signup", json=signup_data)
        print("Response:", resp.json())
        assert resp.status_code == 200, "Signup failed"
        signup_json = resp.json()
        token = signup_json["data"]["access_token"]
        user_id = signup_json["data"]["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # 5. Login (Step 1 - password check & OTP request)
        print("\n[Step 3] Logging In (Password validation)...")
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        resp = await client.post(f"{BASE_URL}/auth/login", json=login_data)
        print("Response:", resp.json())
        assert resp.status_code == 200, "Login step 1 failed"
        assert resp.json()["data"]["require_otp"] is True, "Login should require OTP"

        # 6. Retrieve Login OTP from DB
        await asyncio.sleep(0.5)
        login_otp = await get_latest_otp(TEST_EMAIL, "login")
        print(f"Retrieved Login OTP from DB: {login_otp}")
        assert login_otp != "", "Login OTP not found in database"

        # 7. Verify Login OTP (Step 2)
        print("\n[Step 4] Verifying Login OTP...")
        verify_data = {
            "email": TEST_EMAIL,
            "otp": login_otp
        }
        resp = await client.post(f"{BASE_URL}/auth/login/verify-otp", json=verify_data)
        print("Response:", resp.json())
        assert resp.status_code == 200, "Login verification failed"
        login_token = resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {login_token}"}

        # 8. Create Workspace & Project
        print("\n[Step 5] Setting up Workspace and Project for Task Assignment...")
        resp = await client.post(f"{BASE_URL}/workspaces", json={"name": "Test Workspace"}, headers=headers)
        workspace_id = resp.json()["data"]["id"]
        
        resp = await client.post(
            f"{BASE_URL}/projects", 
            json={
                "name": "Test Project",
                "workspace_id": workspace_id,
                "issue_type": "Bug",
                "category": "HIS",
                "priority": "medium",
                "owner_id": user_id,
                "due_date": "2026-12-31T00:00:00Z"
            }, 
            headers=headers
        )
        project_id = resp.json()["data"]["id"]
        print(f"Created Workspace ID: {workspace_id}, Project ID: {project_id}")

        # 9. Create Task with Assignee (Triggers Assignment Email)
        print("\n[Step 6] Creating Task assigned to self (triggers assignment email)...")
        task_data = {
            "title": "Verification Task",
            "project_id": project_id,
            "assignee_ids": [user_id]
        }
        resp = await client.post(f"{BASE_URL}/tasks", json=task_data, headers=headers)
        print("Response:", resp.json())
        assert resp.status_code == 200, "Task creation failed"
        
        print("\n--- All Tests Executed Successfully! Check backend output for printed mock email outputs. ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
