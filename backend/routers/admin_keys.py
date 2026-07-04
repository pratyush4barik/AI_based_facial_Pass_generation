from sqlalchemy.orm import Session
from model import AdminKey
from fastapi import APIRouter, Depends
from database import get_db
from datetime import datetime, timedelta
from utils.key_generator import generate_admin_key
from schemas import UseKeyRequest as UseKey

def get_unique_key(db: Session):

    while True:

        key = generate_admin_key()

        existing = db.query(AdminKey).filter(
            AdminKey.admin_key == key
        ).first()

        if existing is None:
            return key


router = APIRouter()

@router.post("/admin-key/generate")
def generate_key(db: Session = Depends(get_db)):

    active_key = db.query(AdminKey).filter(
        AdminKey.used == False,
        AdminKey.expires_at > datetime.now()
    ).first()
    
    if active_key:
         return {
            "success": False,
            "message": "A key is already active.",
            "key": active_key.admin_key,
            "expires_at": active_key.expires_at
        }

    key = get_unique_key(db)

    new_key = AdminKey(
        admin_id=1,  # Assuming the admin_id is 1 for this example
        admin_key=key,
        generated_at=datetime.now(),
        expires_at=datetime.now() + timedelta(seconds=30),
        used=False
    )

    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    return {
        "key": new_key.admin_key,
        "expires_at": new_key.expires_at
    }

@router.get("/admin-key/current")
def get_current_key(db: Session = Depends(get_db)):

    key = db.query(AdminKey).filter(
        AdminKey.used == False,
        AdminKey.expires_at > datetime.now()
    ).first()

    if not key:
        return {
            "success": False,
            "key": None
        }

    return {
        "success": True,
        "key": key.admin_key,
        "expires_at": key.expires_at
    }

@router.get("/admin-key/history")
def history(db: Session = Depends(get_db)):

    rows = db.query(AdminKey).order_by(
        AdminKey.generated_at.desc()
    ).all()

    result = []

    for row in rows:

        if row.used:
            status = "Used"

        elif row.expires_at < datetime.now():
            status = "Expired"

        else:
            status = "Active"

        result.append({
            "key_id": row.key_id,
            "admin_key": row.admin_key,
            "generated_at": row.generated_at,
            "used_by": row.security_officer.username if row.security_officer else None,
            "status": status
        })

    return result

@router.post("/admin-key/use")
def use_key(
    request: UseKey,
    db: Session = Depends(get_db)
):

    key = db.query(AdminKey).filter(
        AdminKey.admin_key == request.admin_key
    ).first()

    if not key:
        return {
            "success": False,
            "message": "Invalid key."
        }

    if key.used:
        return {
            "success": False,
            "message": "Key already used."
        }

    if datetime.now() > key.expires_at:
        return {
            "success": False,
            "message": "Key expired."
        }

    # TODO:
    # Replace this with the logged-in security officer ID
    officer_id = 10

    key.used = True
    key.used_by = officer_id
    key.used_at = datetime.now()

    db.commit()

    return {
        "success": True,
        "message": "Key accepted."
    }