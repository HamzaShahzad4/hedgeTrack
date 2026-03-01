"""Auth API: register and login."""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer
from models import db, User
import config

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


def _make_token(user_id: int) -> str:
    """Create a signed token containing user_id (for session)."""
    serializer = URLSafeTimedSerializer(config.SECRET_KEY)
    return serializer.dumps({"user_id": user_id}, salt="hedgetrack-auth")


def _verify_token(token: str):
    """Verify token and return user_id or None. Max age 7 days."""
    serializer = URLSafeTimedSerializer(config.SECRET_KEY)
    try:
        data = serializer.loads(token, salt="hedgetrack-auth", max_age=7 * 24 * 3600)
        return data.get("user_id")
    except Exception:
        return None


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user. Expects JSON: { \"email\", \"password\" }."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    user = User(email=email, password_hash=password_hash)
    db.session.add(user)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            return jsonify({"error": "An account with this email already exists"}), 409
        return jsonify({"error": "Registration failed. Please try again."}), 500

    token = _make_token(user.id)
    return jsonify({
        "message": "Registration successful",
        "user": user.to_dict(),
        "token": token,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Log in. Expects JSON: { \"email\", \"password\" }. Returns user + token."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _make_token(user.id)
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "token": token,
    }), 200
