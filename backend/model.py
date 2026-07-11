from numpy import integer
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import declarative_base, relationship
from database import Base
from sqlalchemy import Column, Date, DateTime,Integer,String, Text, Boolean, ForeignKey

Base = declarative_base()

class Admin(Base):

    __tablename__="admins"

    admin_id = Column(Integer,primary_key=True,index=True)
    username = Column(String,unique=True,index=True)
    password_hash = Column(String)

class SO(Base):

    __tablename__="security_officers"

    officer_id = Column(Integer,primary_key=True,index=True)
    name = Column(String)
    username = Column(String,unique=True,index=True)
    password_hash = Column(String)
    created_at = Column(DateTime)
    admin_keys = Column(String)
    used_keys =relationship(
        "AdminKey",
        back_populates="security_officer"
    )

class Visitor(Base):
    __tablename__ = "visitors"

    visitor_id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String)
    emp_id = Column(String)
    address = Column(Text)
    company_firm = Column(String)
    aadhaar_number = Column(String)
    phone = Column(String)
    purpose = Column(String)
    department = Column(String)
    category = Column(String)
    police_verification_no = Column(String)
    duration = Column(String)
    validity_from = Column(Date)
    validity_to = Column(Date)
    gender = Column(String)
    nationality = Column(String)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    embedding = Column(Vector(512), nullable=True)
    photo_path = Column(Text, nullable=True)
    registered_by = Column(Integer)
    created_at = Column(DateTime)
    edited_by = Column(String, nullable=True)
    edited_at = Column(DateTime, nullable=True)


class PassSession(Base):
    __tablename__ = "pass_sessions"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    visitor_id = Column(Integer, ForeignKey("visitors.visitor_id"), nullable=False)
    emp_id = Column(String, nullable=False, index=True)
    passed = Column(Boolean, default=True, nullable=False)
    detected_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    printed_at = Column(DateTime, nullable=True)

    visitor = relationship("Visitor")


class AdminKey(Base):
    __tablename__ = "admin_keys"

    key_id = Column(Integer, primary_key=True, index=True)
    
    admin_id = Column(Integer, ForeignKey("admins.admin_id"))

    admin_key = Column(String(11), unique=True, nullable=False)

    generated_at = Column(DateTime)

    expires_at = Column(DateTime)

    used = Column(Boolean, default=False)

    used_by = Column(
        Integer,
        ForeignKey("security_officers.officer_id"),
        nullable=True
    )

    used_at = Column(DateTime, nullable=True)

    security_officer = relationship(
        "SO",
        back_populates="used_keys"
        )
    

#     SO
#  │
#  │ used_keys
#  ▼
# AdminKey

# AdminKey
#  │
#  │ security_officer
#  ▼
# SO

class Blacklist(Base):
    __tablename__ = "blacklist"

    blacklist_id = Column(Integer, primary_key=True, autoincrement=True)
    emp_id = Column(String, nullable=True)
    reason_code = Column(String, nullable=False)
    remarks = Column(Text, nullable=True)
    blacklisted_by = Column(Integer, nullable=True)
    blacklisted_at = Column(DateTime, nullable=False)
