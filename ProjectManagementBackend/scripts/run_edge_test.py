import asyncio
import json
import subprocess
import httpx
import websockets
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.otp_verification import OTPVerification

EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
FRONTEND_URL = "http://localhost:5174"
ADMIN_EMAIL = "admin@example.com"

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

async def run_browser_test():
    # 1. Start Edge in headless mode
    print("Starting Edge in headless mode...")
    edge_process = subprocess.Popen([
        EDGE_PATH,
        "--headless",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--user-data-dir=C:\\Users\\hemak\\AppData\\Local\\Temp\\edge-profile-test"
    ])
    
    await asyncio.sleep(2)
    
    try:
        # 2. Get WebSocket debugger URL
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://127.0.0.1:9222/json/list")
            targets = resp.json()
            page_target = next((t for t in targets if t["type"] == "page"), None)
            if not page_target:
                print("No page target found")
                return
            ws_url = page_target["webSocketDebuggerUrl"]
            
        print(f"Connecting to CDP WebSocket: {ws_url}")
        async with websockets.connect(ws_url) as ws:
            id_counter = 1
            
            async def send_cdp(method, params=None):
                nonlocal id_counter
                msg = {"id": id_counter, "method": method, "params": params or {}}
                id_counter += 1
                await ws.send(json.dumps(msg))
                return msg["id"]
                
            # Enable domains
            await send_cdp("Console.enable")
            await send_cdp("Runtime.enable")
            await send_cdp("Network.enable")
            await send_cdp("Page.enable")
            
            # Listen to Network requests
            network_requests = []
            
            async def handle_messages():
                nonlocal network_requests
                while True:
                    try:
                        msg_str = await ws.recv()
                        msg = json.loads(msg_str)
                        
                        if msg.get("method") == "Network.requestWillBeSent":
                            req = msg["params"]["request"]
                            url = req["url"]
                            if "/api/v1/" in url:
                                print(f"[Network API Request] {req['method']} {url}")
                                network_requests.append(url)
                                
                        if msg.get("method") == "Console.messageAdded":
                            print(f"[Console Message] {msg['params']['message']['text']}")
                            
                        if msg.get("method") == "Runtime.consoleAPICalled":
                            args = msg["params"]["args"]
                            log_text = " ".join([str(a.get("value") or a.get("description") or "") for a in args])
                            print(f"[Console Log] {log_text}")
                            
                    except websockets.exceptions.ConnectionClosed:
                        break
                        
            # Start message listener in background
            listener_task = asyncio.create_task(handle_messages())
            
            # Navigate to login
            print("Navigating to login page...")
            await send_cdp("Page.navigate", {"url": f"{FRONTEND_URL}/login"})
            await asyncio.sleep(2)
            
            # Type credentials and click submit
            print("Entering credentials and submitting...")
            login_script = """
            (() => {
              const emailInput = document.getElementById('email');
              const passwordInput = document.getElementById('password');
              const submitBtn = document.querySelector('button[type="submit"]');
              if (emailInput && passwordInput && submitBtn) {
                const setReactValue = (el, val) => {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  setter.call(el, val);
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                };
                setReactValue(emailInput, 'admin@example.com');
                setReactValue(passwordInput, 'Admin@12345');
                setTimeout(() => submitBtn.click(), 50);
                return "Credentials submitted";
              }
              return "Login inputs not found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": login_script, "returnByValue": True})
            await asyncio.sleep(2.5) # Wait for OTP screen
            
            # Fetch OTP from DB
            print("Fetching OTP from DB...")
            otp = await get_latest_otp(ADMIN_EMAIL, "login")
            print(f"Retrieved Login OTP: {otp}")
            
            # Type OTP and verify
            print("Submitting OTP...")
            otp_script = f"""
            (() => {{
              const otpInput = document.getElementById('otp');
              const submitBtn = document.querySelector('button[type="submit"]');
              if (otpInput && submitBtn) {{
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(otpInput, '{otp}');
                otpInput.dispatchEvent(new Event('input', {{ bubbles: True }}));
                setTimeout(() => submitBtn.click(), 50);
                return "OTP submitted";
              }}
              return "OTP input not found";
            }})()
            """
            await send_cdp("Runtime.evaluate", {"expression": otp_script, "returnByValue": True})
            await asyncio.sleep(3) # Wait for home page to load
            
            # Clear network requests log
            network_requests.clear()
            print("Logged in successfully. Clearing network history for clean test.")
            
            # Verify table exists
            check_table = """
            (() => {
              const table = document.querySelector('table');
              return table ? `Table rows: ${table.rows.length}` : "No table found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": check_table, "returnByValue": True})
            
            # Test 1: Click "+ Create" -> "Task"
            print("\n=== Testing '+ Create' -> 'Task' ===")
            click_create = """
            (() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const createBtn = buttons.find(b => b.textContent.includes('Create'));
              if (createBtn) {
                createBtn.click();
                return "Create dropdown clicked";
              }
              return "Create button not found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": click_create, "returnByValue": True})
            await asyncio.sleep(0.5)
            
            click_task = """
            (() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const taskBtn = buttons.find(b => b.textContent.trim() === 'Task');
              if (taskBtn) {
                taskBtn.click();
                return "Task option clicked";
              }
              return "Task option not found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": click_task, "returnByValue": True})
            await asyncio.sleep(1.5)
            
            print(f"Requests captured after clicking '+ Create' -> 'Task': {network_requests}")
            network_requests.clear()
            
            # Close task modal
            close_task = """
            (() => {
              const closeBtn = document.querySelector('button[aria-label="Close"]');
              if (closeBtn) {
                closeBtn.click();
                return "Close button clicked";
              }
              return "Close button not found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": close_task, "returnByValue": True})
            await asyncio.sleep(1)
            network_requests.clear()
            
            # Test 2: Hover and Click project inline plus icon
            print("\n=== Testing Project Inline Plus Icon Click ===")
            click_inline_plus = """
            (() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              // Find the plus icon inside a project cell. Let's find project cell button
              // The button has a tooltip with 'Create Task' inside a div
              const createButtons = buttons.filter(b => {
                const tooltip = b.parentElement.querySelector('.pointer-events-none');
                return tooltip && tooltip.textContent.includes('Create Task');
              });
              if (createButtons.length > 0) {
                createButtons[0].click();
                return `Inline plus clicked (found ${createButtons.length} buttons)`;
              }
              return "Inline plus button not found";
            })()
            """
            await send_cdp("Runtime.evaluate", {"expression": click_inline_plus, "returnByValue": True})
            await asyncio.sleep(1.5)
            
            print(f"Requests captured after clicking inline Project plus icon: {network_requests}")
            
            # Cancel task modal
            await send_cdp("Runtime.evaluate", {"expression": close_task, "returnByValue": True})
            await asyncio.sleep(1)
            
            # Cancel listener
            listener_task.cancel()
            
    finally:
        print("Stopping Edge...")
        edge_process.terminate()
        edge_process.wait()

if __name__ == "__main__":
    asyncio.run(run_browser_test())
