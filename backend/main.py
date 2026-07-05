from pathlib import Path
from uuid import uuid4

from fastapi import Body, FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import or_ 
from model import Blacklist, Visitor
from database import get_db, init_db
from model import Admin
from model import SO
from schemas import LoginRequest
from datetime import date, datetime, timedelta
from routers.admin_keys import router as admin_router
from routers.so_register import router as so_router


app = FastAPI()
PHOTOS_DIR = Path(__file__).resolve().parent / "photos"
face_app = None
PHOTOS_DIR.mkdir(exist_ok=True)
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

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

@app.put("/visitors/{visitor_id}")
async def update_visitor(
    visitor_id: int,
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
    edited_by: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    visitor = (
        db.query(Visitor)
        .filter(Visitor.visitor_id == visitor_id)
        .first()
    )

    if visitor is None:
        raise HTTPException(status_code=404, detail="Visitor not found")

    new_photo_path = None
    new_embedding = None

    if photo is not None and photo.filename:
        new_photo_path = await save_photo(photo)
        try:
            new_embedding = create_embedding(new_photo_path)
        except HTTPException:
            new_photo_path.unlink(missing_ok=True)
            raise

    visitor.full_name = full_name
    visitor.emp_id = emp_id
    visitor.address = address
    visitor.company_firm = company_firm
    visitor.aadhaar_number = aadhaar_number
    visitor.phone = phone
    visitor.purpose = purpose
    visitor.department = department
    visitor.category = category
    visitor.police_verification_no = police_verification_no
    visitor.duration = duration
    visitor.validity_from = validity_from
    visitor.validity_to = validity_to
    visitor.gender = gender
    visitor.nationality = nationality
    visitor.edited_at = datetime.utcnow()
    visitor.edited_by = edited_by or visitor.edited_by or "admin"

    if new_photo_path is not None:
        visitor.photo_path = f"photos/{new_photo_path.name}"
        visitor.embedding = new_embedding

    try:
        db.commit()
    except Exception:
        db.rollback()
        if new_photo_path is not None:
            new_photo_path.unlink(missing_ok=True)
        raise

    return {
        "message": "Visitor updated successfully"
    }


from sqlalchemy import or_

@app.get("/visitors")
def get_visitors(
    search: str = "",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):

    query = db.query(Visitor)
    blacklisted_emp_ids = (
        db.query(Blacklist.emp_id)
        .filter(Blacklist.emp_id.isnot(None))
    )
    query = query.filter(~Visitor.emp_id.in_(blacklisted_emp_ids))

    if search:

        query = query.filter(

            or_(

                Visitor.emp_id.ilike(f"%{search}%"),

                Visitor.full_name.ilike(f"%{search}%"),

                Visitor.aadhaar_number.ilike(f"%{search}%")

            )

        )

    limit = max(1, min(limit, 3000))
    offset = max(0, offset)

    visitors = (
        query
        .order_by(Visitor.visitor_id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []

    for v in visitors:

        result.append({

            "visitor_id": v.visitor_id,

            "emp_id": v.emp_id,

            "full_name": v.full_name,

            "aadhaar_number": v.aadhaar_number,

            "edited_by": v.edited_by,

            "photo_path": v.photo_path

        })

    return result

@app.get("/blacklist")
def get_blacklisted_users(
    search: str = "",
    limit: int = 3000,
    offset: int = 0,
    db: Session = Depends(get_db)
):

    query = db.query(Blacklist)

    if search:

        matching_emp_ids = (
            db.query(Visitor.emp_id)
            .filter(
                or_(
                    Visitor.full_name.ilike(f"%{search}%"),
                    Visitor.aadhaar_number.ilike(f"%{search}%")
                )
            )
        )

        query = query.filter(

            or_(

                Blacklist.emp_id.ilike(f"%{search}%"),

                Blacklist.reason_code.ilike(f"%{search}%"),

                Blacklist.remarks.ilike(f"%{search}%"),

                Blacklist.emp_id.in_(matching_emp_ids)

            )

        )

    limit = max(1, min(limit, 3000))
    offset = max(0, offset)

    rows = (
        query
        .order_by(Blacklist.blacklisted_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []

    for blacklist in rows:

        visitor = (
            db.query(Visitor)
            .filter(Visitor.emp_id == blacklist.emp_id)
            .order_by(Visitor.visitor_id.desc())
            .first()
        )

        result.append({

            "blacklist_id": blacklist.blacklist_id,

            "emp_id": blacklist.emp_id,

            "full_name": visitor.full_name if visitor else None,

            "blacklisted_by": blacklist.blacklisted_by,

            "reason_code": blacklist.reason_code,

            "remarks": blacklist.remarks,

            "blacklisted_at": blacklist.blacklisted_at,

            "aadhaar_number": visitor.aadhaar_number if visitor else None,

            "photo_path": visitor.photo_path if visitor else None

        })

    return result

@app.post("/blacklist")
def create_blacklist_entry(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):

    emp_id = str(payload.get("emp_id") or "").strip()

    if not emp_id:
        raise HTTPException(status_code=400, detail="emp_id is required")

    existing = (
        db.query(Blacklist)
        .filter(Blacklist.emp_id == emp_id)
        .first()
    )

    if existing:
        return {
            "success": True,
            "message": "Visitor is already blacklisted.",
            "blacklist_id": existing.blacklist_id
        }

    visitor = (
        db.query(Visitor)
        .filter(Visitor.emp_id == emp_id)
        .first()
    )

    if visitor is None:
        raise HTTPException(status_code=404, detail="Visitor not found")

    entry = Blacklist(
        emp_id=emp_id,
        reason_code=str(payload.get("reason_code") or "1"),
        remarks=payload.get("remarks"),
        blacklisted_by=payload.get("blacklisted_by"),
        blacklisted_at=datetime.now()
    )

    try:
        db.add(entry)
        db.commit()
        db.refresh(entry)
    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "message": "Visitor blacklisted successfully.",
        "blacklist_id": entry.blacklist_id
    }

@app.delete("/blacklist/{blacklist_id}")
def remove_blacklist_entry(
    blacklist_id: int,
    db: Session = Depends(get_db)
):

    entry = (
        db.query(Blacklist)
        .filter(Blacklist.blacklist_id == blacklist_id)
        .first()
    )

    if entry is None:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")

    try:
        db.delete(entry)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "message": "Blacklist entry removed successfully."
    }

@app.get("/visitors/{visitor_id}")
def get_visitor(visitor_id: int, db: Session = Depends(get_db)):

    visitor = (
        db.query(Visitor)
        .filter(Visitor.visitor_id == visitor_id)
        .first()
    )

    if visitor is None:
        raise HTTPException(status_code=404, detail="Visitor not found")

    is_blacklisted = (
        db.query(Blacklist)
        .filter(Blacklist.emp_id == visitor.emp_id)
        .first()
    )

    if is_blacklisted:
        raise HTTPException(status_code=404, detail="Visitor is blacklisted")

    return {
        "visitor_id": visitor.visitor_id,
        "full_name": visitor.full_name,
        "emp_id": visitor.emp_id,
        "address": visitor.address,
        "company_firm": visitor.company_firm,
        "aadhaar_number": visitor.aadhaar_number,
        "phone": visitor.phone,
        "purpose": visitor.purpose,
        "department": visitor.department,
        "category": visitor.category,
        "police_verification_no": visitor.police_verification_no,
        "duration": visitor.duration,
        "validity_from": visitor.validity_from,
        "validity_to": visitor.validity_to,
        "gender": visitor.gender,
        "nationality": visitor.nationality,
        "photo_path": visitor.photo_path,
        "registered_by": visitor.registered_by,
        "created_at": visitor.created_at,
        "edited_by": visitor.edited_by,
        "edited_at": visitor.edited_at
    }
app.include_router(admin_router)

app.include_router(so_router)
