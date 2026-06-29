from numpy import integer
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Date, DateTime,Integer,String, Text

Base = declarative_base()

class Admin(Base):

    __tablename__="admins"

    admin_id = Column(Integer,primary_key=True,index=True)
    username = Column(String,unique=True,index=True)
    password_hash = Column(String)

class SO(Base):

    __tablename__="security_officers"

    officer_id = Column(Integer,primary_key=True,index=True)
    admin_id = Column(Integer)
    name = Column(String)
    username = Column(String,unique=True,index=True)
    password_hash = Column(String)

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
