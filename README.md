# AI_based_facial_Pass_generation

FastAPI backend and static frontend pages for facial pass generation, visitor registration, and security officer workflows.

## Requirements

Install the Python dependencies from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Run the project

1. Start the PostgreSQL container:

```powershell
docker compose up -d db
```

2. Start the backend API from the `backend` folder:

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. Open the frontend pages directly in a browser. Start with `frontend/login_page/index.html` and then navigate to the other pages as needed.

## Notes

The backend uses `DATABASE_URL` if it is set, otherwise it connects to `postgresql://postgres:postgres123@localhost:55432/visit_db`. Optional runtime settings include `RECOGNITION_THRESHOLD`, `ANTI_SPOOF_THRESHOLD`, and `MINIFASNET_MODEL_PATH`.
