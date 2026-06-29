from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from model import Visitor
from database import get_db
from model import Admin
from model import SO
from schemas import LoginRequest, VisitorCreate
from datetime import datetime, timedelta

app = FastAPI()

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

@app.post("/visitors")
def create_visitor(visitor: VisitorCreate, db: Session = Depends(get_db)):
    check_in = datetime.now()

    try:
        hours = int(visitor.duration) if visitor.duration else 24
    except ValueError:
        hours = 24  

    check_out = check_in + timedelta(hours=hours)

    new_visitor = Visitor(
    full_name=visitor.full_name,
    emp_id=visitor.emp_id,
    address=visitor.address,
    company_firm=visitor.company_firm,
    aadhaar_number=visitor.aadhaar_number,
    phone=visitor.phone,
    purpose=visitor.purpose,
    department=visitor.department,
    category=visitor.category,
    police_verification_no=visitor.police_verification_no,
    duration=visitor.duration,
    validity_from=visitor.validity_from,
    validity_to=visitor.validity_to,
    gender=visitor.gender,
    nationality=visitor.nationality,
    check_in=check_in,
    check_out=check_out,
    embedding=None,
    photo_path=None,
    registered_by=1,
    created_at=datetime.now()
)

    db.add(new_visitor)
    db.commit()
    db.refresh(new_visitor)

    return new_visitor