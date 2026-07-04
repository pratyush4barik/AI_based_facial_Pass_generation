from schemas import SORegister
from sqlalchemy.orm import Session
from model import SO, AdminKey
from fastapi import APIRouter, Depends
from database import get_db
from datetime import datetime

router = APIRouter()

@router.post("/security-officer/register")
def register_officer(request:SORegister,db:Session=Depends(get_db)):
    
    existing=db.query(SO).filter(
    SO.username==request.username
    ).first()

    if existing:

        return{

            "success":False,

            "message":"Username already exists."

        }
    
    key=db.query(AdminKey).filter(
    AdminKey.admin_key==request.admin_keys
    ).first()

    if not key:

        return{

            "success":False,

            "message":"Invalid Admin key."

        }
    if datetime.now()>key.expires_at:

        return{

            "success":False,

            "message":"Admin key Expired."

        }
    if key.used:

        return{

            "success":False,

            "message":"Admin key Already Used."

        }
    new_officer = SO(
    name=request.name,
    username=request.username,
    password_hash=request.password,
    admin_keys=request.admin_keys,
    created_at=datetime.now()
    )
    
    db.add(new_officer)
    db.commit()
    db.refresh(new_officer)

    key.used=True
    key.used_by=new_officer.officer_id
    key.used_at=datetime.now()

    db.commit()

    return{
        "success":True,
        "message":"Security Officer Registered Successfully.",
    }