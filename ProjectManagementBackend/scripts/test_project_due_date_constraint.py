import asyncio
import httpx
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification
from app.models.user import User

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "duedate_test@aighospitals.com"
TEST_NAME = "DueDate Tester"
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
    async with httpx.AsyncClient() as client:
        print("\n--- Starting End-to-End Project Due Date Constraint Verification ---")
        
        # 1. Clean up existing test user
        await cleanup_test_user()

        # 2. Request Registration OTP
        print("\n[Step 1] Requesting Registration OTP...")
        resp = await client.post(f"{BASE_URL}/auth/register/request-otp", json={"email": TEST_EMAIL})
        assert resp.status_code == 200, "Failed to request OTP"

        # 3. Retrieve Registration OTP from DB
        otp = await get_latest_otp(TEST_EMAIL, "registration")
        print(f"Retrieved Registration OTP: {otp}")
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
        assert resp.status_code == 200, "Signup failed"
        signup_json = resp.json()
        token = signup_json["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 5. Login (Step 1)
        print("\n[Step 3] Logging In...")
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        resp = await client.post(f"{BASE_URL}/auth/login", json=login_data)
        assert resp.status_code == 200
        assert resp.json()["data"]["require_otp"] is True

        # 6. Retrieve Login OTP
        await asyncio.sleep(0.5)
        login_otp = await get_latest_otp(TEST_EMAIL, "login")
        print(f"Retrieved Login OTP: {login_otp}")

        # 7. Verify Login OTP (Step 2)
        print("\n[Step 4] Verifying Login OTP...")
        verify_data = {
            "email": TEST_EMAIL,
            "otp": login_otp
        }
        resp = await client.post(f"{BASE_URL}/auth/login/verify-otp", json=verify_data)
        assert resp.status_code == 200
        login_json = resp.json()
        login_token = login_json["data"]["access_token"]
        owner_id = login_json["data"]["user"]["id"]
        headers = {"Authorization": f"Bearer {login_token}"}

        # 8. Create Workspace
        print("\n[Step 5] Creating Workspace...")
        resp = await client.post(f"{BASE_URL}/workspaces", json={"name": "DueDate Test Workspace"}, headers=headers)
        workspace_id = resp.json()["data"]["id"]

        # 9. Attempt to create project WITHOUT a due date (should FAIL)
        print("\n[Step 6] Attempting to create project WITHOUT due_date (should fail with 422)...")
        resp = await client.post(
            f"{BASE_URL}/projects", 
            json={
                "name": "DueDate Test Project",
                "workspace_id": workspace_id,
                "issue_type": "Bug",
                "category": "HIS",
                "priority": "medium",
                "owner_id": owner_id
            }, 
            headers=headers
        )
        print("Status code:", resp.status_code)
        assert resp.status_code == 422

        # 10. Create project WITH a due date (should SUCCEED)
        print("\n[Step 7] Creating project WITH due_date = 2026-10-31T00:00:00Z...")
        resp = await client.post(
            f"{BASE_URL}/projects", 
            json={
                "name": "DueDate Test Project",
                "workspace_id": workspace_id,
                "issue_type": "Bug",
                "category": "HIS",
                "priority": "medium",
                "owner_id": owner_id,
                "due_date": "2026-10-31T00:00:00Z"
            }, 
            headers=headers
        )
        assert resp.status_code == 200
        project_id = resp.json()["data"]["id"]
        print("Project created successfully. Project ID:", project_id)

        # 11. Create a task with a due date LATER than project's due date (should FAIL)
        print("\n[Step 8] Attempting to create task with due_date = 2026-11-15T00:00:00Z (should fail with 400)...")
        task_resp = await client.post(
            f"{BASE_URL}/tasks", 
            json={
                "title": "Invalid Task",
                "project_id": project_id,
                "due_date": "2026-11-15T00:00:00Z"
            }, 
            headers=headers
        )
        print("Status code:", task_resp.status_code, "Body:", task_resp.json())
        assert task_resp.status_code == 400
        assert "cannot exceed project due date" in task_resp.json()["message"]

        # 12. Create a task with a due date EARLIER than project's due date (should SUCCEED)
        print("\n[Step 9] Creating task with due_date = 2026-10-15T00:00:00Z (should succeed)...")
        task_resp = await client.post(
            f"{BASE_URL}/tasks", 
            json={
                "title": "Valid Task",
                "project_id": project_id,
                "due_date": "2026-10-15T00:00:00Z"
            }, 
            headers=headers
        )
        assert task_resp.status_code == 200
        task_id = task_resp.json()["data"]["id"]
        print("Task created successfully. Task ID:", task_id)

        # 13. Attempt to update task's due date to be LATER than project's due date (should FAIL)
        print("\n[Step 10] Attempting to update task due_date to 2026-11-01T00:00:00Z (should fail with 400)...")
        update_resp = await client.patch(
            f"{BASE_URL}/tasks/{task_id}",
            json={"due_date": "2026-11-01T00:00:00Z"},
            headers=headers
        )
        print("Status code:", update_resp.status_code, "Body:", update_resp.json())
        assert update_resp.status_code == 400
        assert "cannot exceed project due date" in update_resp.json()["message"]

        # 14. Clean up
        await cleanup_test_user()
        print("\n=== All Project Due Date Constraint Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
