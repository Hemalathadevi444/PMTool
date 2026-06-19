import asyncio
import httpx
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification
from app.models.user import User

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "status_test@aighospitals.com"
TEST_NAME = "Status Tester"
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
        print("\n--- Starting End-to-End Subtask Status Constraint Verification ---")
        
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

        # 8. Create Workspace & Project
        print("\n[Step 5] Creating Workspace and Project...")
        resp = await client.post(f"{BASE_URL}/workspaces", json={"name": "Status Test Workspace"}, headers=headers)
        workspace_id = resp.json()["data"]["id"]
        
        resp = await client.post(
            f"{BASE_URL}/projects", 
            json={
                "name": "Status Test Project",
                "workspace_id": workspace_id,
                "issue_type": "Bug",
                "category": "HIS",
                "priority": "medium",
                "owner_id": owner_id,
                "due_date": "2026-12-31T00:00:00Z"
            }, 
            headers=headers
        )
        project_id = resp.json()["data"]["id"]
        print(f"Workspace: {workspace_id}, Project: {project_id}")

        # 9. Create a parent task
        print("\n[Step 6] Creating Parent Task...")
        task_resp = await client.post(
            f"{BASE_URL}/tasks", 
            json={"title": "Parent Task", "project_id": project_id}, 
            headers=headers
        )
        assert task_resp.status_code == 200
        parent_task_id = task_resp.json()["data"]["id"]
        print(f"Parent Task ID: {parent_task_id}")

        # 10. Create a subtask
        print("\n[Step 7] Creating Subtask...")
        subtask_resp = await client.post(
            f"{BASE_URL}/tasks/{parent_task_id}/subtasks",
            json={"title": "Subtask", "status": "todo", "priority": "medium"},
            headers=headers
        )
        assert subtask_resp.status_code == 200
        subtask_id = subtask_resp.json()["data"]["id"]
        print(f"Subtask ID: {subtask_id}")

        # 11. Attempt to set parent task to DONE (should FAIL because subtask is TODO)
        print("\n[Step 8] Attempting to set Parent Task to 'done' (should fail)...")
        update_resp = await client.patch(
            f"{BASE_URL}/tasks/{parent_task_id}",
            json={"status": "done"},
            headers=headers
        )
        print("Status code:", update_resp.status_code, "Body:", update_resp.json())
        assert update_resp.status_code == 400
        assert "one or more subtasks are not completed" in update_resp.json()["message"]

        # 12. Complete the subtask (set status to DONE)
        print("\n[Step 9] Setting Subtask to 'done' (should succeed)...")
        sub_update_resp = await client.patch(
            f"{BASE_URL}/tasks/{subtask_id}",
            json={"status": "done"},
            headers=headers
        )
        assert sub_update_resp.status_code == 200
        print("Subtask updated to done successfully")

        # 13. Complete the parent task (should now SUCCEED)
        print("\n[Step 10] Setting Parent Task to 'done' (should succeed)...")
        parent_update_resp = await client.patch(
            f"{BASE_URL}/tasks/{parent_task_id}",
            json={"status": "done"},
            headers=headers
        )
        assert parent_update_resp.status_code == 200
        print("Parent task updated to done successfully")

        # 14. Change parent task back to IN_PROGRESS (should NOT change subtask's DONE status)
        print("\n[Step 11] Setting Parent Task status back to 'in_progress' (subtask status should not change)...")
        parent_inprogress_resp = await client.patch(
            f"{BASE_URL}/tasks/{parent_task_id}",
            json={"status": "in_progress"},
            headers=headers
        )
        assert parent_inprogress_resp.status_code == 200
        
        # 15. Fetch subtask status and assert it remains 'done'
        print("\n[Step 12] Fetching subtask and verifying status is still 'done'...")
        get_sub_resp = await client.get(f"{BASE_URL}/tasks/{subtask_id}", headers=headers)
        assert get_sub_resp.status_code == 200
        sub_status = get_sub_resp.json()["data"]["status"]
        print("Subtask status is:", sub_status)
        assert sub_status == "done", "Subtask status was incorrectly changed!"

        # 16. Clean up
        await cleanup_test_user()
        print("\n=== All Subtask Status Constraint Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
