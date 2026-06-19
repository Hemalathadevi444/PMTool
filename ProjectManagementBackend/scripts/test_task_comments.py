import asyncio
import httpx
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification
from app.models.user import User

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "comment_test@aighospitals.com"
TEST_NAME = "Comment Tester"
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
        print("\n--- Starting End-to-End Task & Subtask Comments Verification ---")
        
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
        user_id = signup_json["data"]["user"]["id"]
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
        resp = await client.post(f"{BASE_URL}/workspaces", json={"name": "Comment Test Workspace"}, headers=headers)
        workspace_id = resp.json()["data"]["id"]
        
        resp = await client.post(
            f"{BASE_URL}/projects", 
            json={
                "name": "Comment Test Project",
                "workspace_id": workspace_id,
                "issue_type": "Bug",
                "category": "HIS",
                "priority": "medium",
                "owner_id": owner_id,
                "due_date": "2026-12-31T00:00:00Z"
            }, 
            headers=headers
        )
        if resp.status_code != 200 or resp.json().get("data") is None:
            print("Project creation failed. Status:", resp.status_code, "Body:", resp.json())
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

        # 11. Add comment to parent task
        print("\n[Step 8] Adding comment to Parent Task...")
        comment_parent_resp = await client.post(
            f"{BASE_URL}/tasks/{parent_task_id}/comments",
            json={"content": "This is a comment on the parent task."},
            headers=headers
        )
        assert comment_parent_resp.status_code == 200
        print("Parent Task Comment Added:", comment_parent_resp.json())

        # 12. Add comment to subtask
        print("\n[Step 9] Adding comment to Subtask...")
        comment_sub_resp = await client.post(
            f"{BASE_URL}/tasks/{subtask_id}/comments",
            json={"content": "This is a comment on the subtask."},
            headers=headers
        )
        assert comment_sub_resp.status_code == 200
        print("Subtask Comment Added:", comment_sub_resp.json())

        # 13. List and assert comments for parent task
        print("\n[Step 10] Retrieving comments for Parent Task...")
        get_parent_comments = await client.get(f"{BASE_URL}/tasks/{parent_task_id}/comments", headers=headers)
        assert get_parent_comments.status_code == 200
        parent_comments = get_parent_comments.json()["data"]
        print(f"Parent Task Comments ({len(parent_comments)}):", parent_comments)
        assert len(parent_comments) == 1
        assert parent_comments[0]["content"] == "This is a comment on the parent task."
        assert parent_comments[0]["task_id"] == parent_task_id

        # 14. List and assert comments for subtask
        print("\n[Step 11] Retrieving comments for Subtask...")
        get_sub_comments = await client.get(f"{BASE_URL}/tasks/{subtask_id}/comments", headers=headers)
        assert get_sub_comments.status_code == 200
        sub_comments = get_sub_comments.json()["data"]
        print(f"Subtask Comments ({len(sub_comments)}):", sub_comments)
        assert len(sub_comments) == 1
        assert sub_comments[0]["content"] == "This is a comment on the subtask."
        assert sub_comments[0]["task_id"] == subtask_id

        # 14.5. Retrieve project comments and assert they do not contain task comments
        print("\n[Step 11.5] Retrieving comments for Project (should be isolated from task comments)...")
        get_proj_comments = await client.get(f"{BASE_URL}/projects/{project_id}/comments", headers=headers)
        assert get_proj_comments.status_code == 200
        proj_comments = get_proj_comments.json()["data"]
        print(f"Project Comments ({len(proj_comments)}):", proj_comments)
        assert len(proj_comments) == 0, "Project comments should not return task-level comments!"

        # 15. Verify that task comments are independent
        print("\n[Step 12] Confirming comments are independent...")
        assert parent_comments[0]["id"] != sub_comments[0]["id"]
        print("Task-level and subtask-level comments verified as independent and functional!")

        # 16. Clean up
        await cleanup_test_user()
        print("\n=== All Task and Subtask Comment Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
