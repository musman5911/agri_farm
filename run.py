import os
import sys
import subprocess

def run():
    port = os.getenv("PORT", "8000")
    print(f"🚀 [Startup] Preparing single-service production launch on port {port}...")
    
    # 1. Build React frontend if dist is missing or needs compilation
    dist_path = os.path.abspath("frontend/dist")
    if not os.path.exists(dist_path):
        print("📦 [Startup] Building React frontend static assets...")
        try:
            subprocess.run("npm install", shell=True, cwd="frontend", check=True)
            subprocess.run("npm run build", shell=True, cwd="frontend", check=True)
            print("✅ [Startup] Frontend build compiled successfully.")
        except Exception as e:
            print(f"⚠️ [Startup] Warning: Frontend build failed: {e}")
            print("   Please ensure NodeJS is installed on the host.")
    
    # 2. Add backend to path and start Uvicorn
    sys.path.append(os.path.abspath("backend"))
    import uvicorn
    
    print(f"🚀 [Startup] Launching Uvicorn FastAPI backend on 0.0.0.0:{port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=int(port), app_dir="backend", reload=False)

if __name__ == "__main__":
    run()
