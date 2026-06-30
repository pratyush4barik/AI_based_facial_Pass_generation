from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from model import Visitor
from database import get_db, init_db
from model import Admin
from model import SO
from schemas import LoginRequest
from datetime import date, datetime, timedelta

app = FastAPI()
PHOTOS_DIR = Path(__file__).resolve().parent / "photos"
face_app = None

@app.on_event("startup")
def on_startup():
    init_db()
    PHOTOS_DIR.mkdir(exist_ok=True)
    get_face_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    # Check Admin table
    admin = db.query(Admin).filter(
        Admin.username == data.username
    ).first()

    if admin:
        if admin.password_hash != data.password:
            return {
                "success": False,
                "message": "Invalid password"
            }

        return {
            "success": True,
            "role": "admin",
            "admin_id": admin.admin_id,
            "username": admin.username,
            "name": "Admin"
        }

    # Check Security Officer table
    so = db.query(SO).filter(
        SO.username == data.username
    ).first()

    if so:
        if so.password_hash != data.password:
            return {
                "success": False,
                "message": "Invalid password"
            }

        return {
            "success": True,
            "role": "security_officer",
            "officer_id": so.officer_id,
            "admin_id": so.admin_id,
            "name": so.name,
            "username": so.username
        }

    return {
        "success": False,
        "message": "Invalid username"
    }

def get_face_app():
    global face_app

    if face_app is None:
        try:
            import insightface
        except ImportError as exc:
            raise RuntimeError(
                "insightface is not installed in the backend environment. "
                "Install backend/requirements.txt before starting the server."
            ) from exc

        face_app = insightface.app.FaceAnalysis()
        face_app.prepare(ctx_id=-1)

    return face_app

def create_embedding(image_path: Path):
    try:
        import cv2
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="opencv-python is not installed in the backend environment."
        ) from exc

    image = cv2.imread(str(image_path))
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to read uploaded photo.")

    faces = get_face_app().get(image)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in uploaded photo.")

    embedding = faces[0].embedding
    if len(embedding) != 512:
        raise HTTPException(status_code=400, detail="Face embedding is not 512 dimensions.")

    return embedding.astype(float).tolist()

async def save_photo(photo: UploadFile):
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    suffix = Path(photo.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    photo_filename = f"{uuid4().hex}{suffix}"
    photo_path = PHOTOS_DIR / photo_filename
    photo_bytes = await photo.read()

    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Uploaded photo is empty.")

    PHOTOS_DIR.mkdir(exist_ok=True)
    photo_path.write_bytes(photo_bytes)
    return photo_path

@app.post("/visitors")
async def create_visitor(
    full_name: str = Form(...),
    emp_id: str = Form(...),
    address: str = Form(...),
    company_firm: str = Form(...),
    aadhaar_number: str = Form(...),
    phone: str = Form(...),
    purpose: str = Form(...),
    department: str = Form(...),
    category: str = Form(...),
    police_verification_no: str = Form(...),
    duration: str | None = Form(None),
    validity_from: date = Form(...),
    validity_to: date = Form(...),
    gender: str = Form(...),
    nationality: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    check_in = datetime.now()
    photo_path = await save_photo(photo)

    try:
        embedding = create_embedding(photo_path)
    except HTTPException:
        photo_path.unlink(missing_ok=True)
        raise

    try:
        hours = int(duration) if duration else 24
    except ValueError:
        hours = 24  

    check_out = check_in + timedelta(hours=hours)

    new_visitor = Visitor(
        full_name=full_name,
        emp_id=emp_id,
        address=address,
        company_firm=company_firm,
        aadhaar_number=aadhaar_number,
        phone=phone,
        purpose=purpose,
        department=department,
        category=category,
        police_verification_no=police_verification_no,
        duration=duration,
        validity_from=validity_from,
        validity_to=validity_to,
        gender=gender,
        nationality=nationality,
        check_in=check_in,
        check_out=check_out,
        embedding=embedding,
        photo_path=f"photos/{photo_path.name}",
        registered_by=1,
        created_at=datetime.now()
    )

    try:
        db.add(new_visitor)
        db.commit()
        db.refresh(new_visitor)
    except Exception:
        db.rollback()
        photo_path.unlink(missing_ok=True)
        raise

    return {
        "success": True,
        "message": "Visitor saved successfully.",
        "visitor_id": new_visitor.visitor_id,
        "photo_path": new_visitor.photo_path
    }
