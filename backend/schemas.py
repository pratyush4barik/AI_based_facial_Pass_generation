from pydantic import BaseModel
from datetime import date

class LoginRequest(BaseModel):
    username:str
    password:str

class VisitorCreate(BaseModel):
    full_name: str
    emp_id: str
    address: str
    company_firm: str
    aadhaar_number: str
    phone: str
    purpose: str
    department: str
    category: str
    police_verification_no: str
    duration: str | None = None
    validity_from: date
    validity_to: date
    gender: str
    nationality: str