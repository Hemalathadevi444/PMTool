import asyncio
from uuid import uuid4
from sqlalchemy import select, delete

from app.database.session import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import WorkspaceService
from app.utils.exceptions import AppException

TEST_EMAIL = "ws_test_user@aighospitals.com"
TEST_NAME = "Workspace Tester"
TEST_PASSWORD = "Password@123"

async def get_or_create_test_user(session) -> User:
    result = await session.execute(
        select(User).where(User.email == TEST_EMAIL)
    )
    user = result.scalar_one_or_none()
    if not user:
        # Create a basic user for testing
        from app.utils.security import get_password_hash
        user = User(
            email=TEST_EMAIL,
            full_name=TEST_NAME,
            hashed_password=get_password_hash(TEST_PASSWORD),
            is_active=True,
        )
        session.add(user)
        await session.flush()
        print(f"Created temporary test user: {TEST_EMAIL}")
    return user

async def cleanup_test_data():
    async with AsyncSessionLocal() as session:
        # Find test user
        result = await session.execute(
            select(User).where(User.email == TEST_EMAIL)
        )
        user = result.scalar_one_or_none()
        if user:
            # Delete workspaces owned by this user
            result = await session.execute(
                select(Workspace).where(Workspace.owner_id == user.id)
            )
            workspaces = result.scalars().all()
            for ws in workspaces:
                await session.execute(delete(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id))
                await session.execute(delete(Workspace).where(Workspace.id == ws.id))
            
            # Delete user
            await session.execute(delete(User).where(User.id == user.id))
            await session.commit()
            print("Cleaned up test user and workspaces.")

async def run_tests():
    print("\n--- Starting Workspace Duplicate Name Prevention Tests ---")
    await cleanup_test_data()
    
    async with AsyncSessionLocal() as session:
        user = await get_or_create_test_user(session)
        service = WorkspaceService(session)
        
        # 1. Create unique workspace
        print("\n[Step 1] Creating workspace 'Unique WS 1'...")
        data1 = WorkspaceCreate(name="Unique WS 1", description="First test workspace")
        ws1 = await service.create_workspace(data1, user)
        assert ws1.name == "Unique WS 1"
        print("Success: Workspace 'Unique WS 1' created.")
        
        # 2. Attempt to create workspace with EXACT same name
        print("\n[Step 2] Attempting to create duplicate workspace 'Unique WS 1'...")
        try:
            await service.create_workspace(data1, user)
            assert False, "Should have failed to create duplicate workspace"
        except AppException as e:
            assert e.status_code == 400
            assert e.message == "A workspace with this name already exists"
            print("Success: Correctly blocked exact duplicate workspace name.")

        # 3. Attempt to create workspace with same name but DIFFERENT case (case-insensitive check)
        print("\n[Step 3] Attempting to create duplicate workspace 'unique ws 1'...")
        data_lower = WorkspaceCreate(name="unique ws 1", description="Lowercase test workspace")
        try:
            await service.create_workspace(data_lower, user)
            assert False, "Should have failed to create case-insensitive duplicate workspace"
        except AppException as e:
            assert e.status_code == 400
            assert e.message == "A workspace with this name already exists"
            print("Success: Correctly blocked case-insensitive duplicate workspace name.")

        # 4. Create second workspace with a different name
        print("\n[Step 4] Creating workspace 'Unique WS 2'...")
        data2 = WorkspaceCreate(name="Unique WS 2", description="Second test workspace")
        ws2 = await service.create_workspace(data2, user)
        assert ws2.name == "Unique WS 2"
        print("Success: Workspace 'Unique WS 2' created.")

        # 5. Attempt to rename second workspace to an existing workspace's name
        print("\n[Step 5] Attempting to update 'Unique WS 2' to 'Unique WS 1'...")
        update_data = WorkspaceUpdate(name="Unique WS 1")
        try:
            await service.update_workspace(ws2.id, update_data, user)
            assert False, "Should have failed to rename workspace to an existing name"
        except AppException as e:
            assert e.status_code == 400
            assert e.message == "A workspace with this name already exists"
            print("Success: Correctly blocked renaming to an existing name.")

        # 6. Attempt to rename second workspace to same name but case-insensitive
        print("\n[Step 6] Attempting to update 'Unique WS 2' to 'unique ws 1'...")
        update_data_lower = WorkspaceUpdate(name="unique ws 1")
        try:
            await service.update_workspace(ws2.id, update_data_lower, user)
            assert False, "Should have failed to rename workspace to a case-insensitive existing name"
        except AppException as e:
            assert e.status_code == 400
            assert e.message == "A workspace with this name already exists"
            print("Success: Correctly blocked renaming to case-insensitive existing name.")

        # 7. Update workspace with its own name (should succeed)
        print("\n[Step 7] Updating 'Unique WS 2' with same name 'Unique WS 2'...")
        update_data_same = WorkspaceUpdate(name="Unique WS 2", description="Updated description")
        updated_ws2 = await service.update_workspace(ws2.id, update_data_same, user)
        assert updated_ws2.name == "Unique WS 2"
        assert updated_ws2.description == "Updated description"
        print("Success: Updating workspace with its own name and new description succeeded.")

        # Commit everything to database to make sure it's valid
        await session.commit()
        
    await cleanup_test_data()
    print("\n=== All Workspace Duplicate Name Prevention Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
