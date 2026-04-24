from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contacts = relationship("Contact", back_populates="user", cascade="all, delete-orphan")
    applications = relationship(
        "Application", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Contact(db.Model):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    firm = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    next_follow_up = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="contacts")
    interactions = relationship(
        "Interaction", back_populates="contact", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "firm": self.firm,
            "job_title": self.job_title,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "next_follow_up": self.next_follow_up.isoformat()
            if self.next_follow_up
            else None,
        }


class Interaction(db.Model):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(
        Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type = Column(String(50), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contact = relationship("Contact", back_populates="interactions")

    def to_dict(self):
        return {
            "id": self.id,
            "contact_id": self.contact_id,
            "type": self.type,
            "date": self.date.isoformat() if self.date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Application(db.Model):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    firm_name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    status = Column(String(64), nullable=False, server_default="Applied")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="applications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "firm_name": self.firm_name,
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
