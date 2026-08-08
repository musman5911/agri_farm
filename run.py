import os
import sys
import subprocess
import site

# Force Python to search inside your writable Replit user site-packages folder
sys.path.append(site.getusersitepackages())

def run():
    port = os.getenv("PORT", "8000")
    print(f"🚀 [Startup] Preparing single-service production launch on port {port}...")
    
    # 1. Auto-install Python dependencies in the writable user space (--user)
    print("📦 [Startup] Installing and verifying Python backend dependencies...")
    try:
        subprocess.run("python -m pip install --user -r backend/requirements.txt", shell=True, check=True)
        print("✅ [Startup] Python dependencies successfully verified.")
    except Exception as e:
        print(f"⚠️ [Startup] Warning: Python dependency installation had issues: {e}")
    
    # 2. Add backend to path and start Uvicorn
    sys.path.append(os.path.abspath("backend"))
    import uvicorn
    
    print(f"🚀 [Startup] Launching Uvicorn FastAPI backend on 0.0.0.0:{port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=int(port), app_dir="backend", reload=False)

if __name__ == "__main__":
    run()
