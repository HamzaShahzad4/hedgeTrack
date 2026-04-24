from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import text

from config import DATABASE_URL, SECRET_KEY
from models import db, Application, Contact, Interaction

# Aligns existing DBs that still use firm/stage (Checkpoint 4 renames) with models.py.
_APPLICATIONS_LEGACY_MIGRATION = """
DO $mk$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'applications'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'firm'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'firm_name'
    ) THEN
      ALTER TABLE applications RENAME COLUMN firm TO firm_name;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'stage'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'status'
    ) THEN
      ALTER TABLE applications RENAME COLUMN stage TO status;
      UPDATE applications SET status = CASE LOWER(status)
        WHEN 'applied' THEN 'Applied'
        WHEN 'first_round' THEN 'First Round'
        WHEN 'superday' THEN 'Superday'
        WHEN 'offer' THEN 'Offer'
        ELSE status
      END;
    END IF;
  END IF;
END $mk$;
"""

APPLICATION_STATUSES = frozenset({"Applied", "First Round", "Superday", "Offer"})
STAGE_SLUG_TO_STATUS = {
    "applied": "Applied",
    "first_round": "First Round",
    "superday": "Superday",
    "offer": "Offer",
}

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = SECRET_KEY

CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

db.init_app(app)

from routes.auth import auth_bp

app.register_blueprint(auth_bp)


def _migrate_applications_legacy_columns() -> None:
    """Rename firm→firm_name, stage→status if present (PostgreSQL)."""
    with app.app_context():
        try:
            db.session.execute(text(_APPLICATIONS_LEGACY_MIGRATION))
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception("applications legacy column migration failed")


_migrate_applications_legacy_columns()


def _get_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip() or None
    return request.headers.get("X-Auth-Token") or None


def _get_current_user_id() -> int | None:
    token = _get_bearer_token()
    if not token:
        return None
    serializer = URLSafeTimedSerializer(SECRET_KEY)
    try:
        data = serializer.loads(token, salt="hedgetrack-auth", max_age=7 * 24 * 3600)
        user_id = data.get("user_id")
        return int(user_id) if user_id is not None else None
    except Exception:
        return None


def _parse_interaction_date(value):
    if value is None or value == "":
        return datetime.now(timezone.utc)
    if isinstance(value, str):
        s = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def _parse_next_follow_up_override(value):
    """If missing/empty, return None (caller uses auto +30 days). Else parsed aware datetime or raises ValueError."""
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    if not isinstance(value, str):
        raise ValueError("next_follow_up must be a string")
    s = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _contact_owned_by(contact_id: int, user_id: int) -> Contact | None:
    return Contact.query.filter_by(id=contact_id, user_id=user_id).first()


@app.route("/api/contacts", methods=["POST"])
def create_contact():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = (data.get("name") or "").strip()
    firm = (data.get("firm") or "").strip()
    job_title = (data.get("job_title") or "").strip()
    email = (data.get("email") or "").strip()

    missing = []
    if not name:
        missing.append("name")
    if not firm:
        missing.append("firm")
    if not job_title:
        missing.append("job_title")
    if not email:
        missing.append("email")
    if missing:
        return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400

    contact = Contact(user_id=user_id, name=name, firm=firm, job_title=job_title, email=email)
    db.session.add(contact)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create contact"}), 500

    return jsonify({"contact": contact.to_dict()}), 201


@app.route("/api/contacts", methods=["GET"])
def list_contacts():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        contacts = Contact.query.filter_by(user_id=user_id).order_by(Contact.created_at.desc()).all()
    except Exception:
        return jsonify({"error": "Failed to fetch contacts"}), 500

    return jsonify({"contacts": [c.to_dict() for c in contacts]}), 200


@app.route("/api/contacts/<int:contact_id>/interactions", methods=["GET"])
def list_interactions(contact_id):
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    contact = _contact_owned_by(contact_id, user_id)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404

    try:
        rows = (
            Interaction.query.filter_by(contact_id=contact_id)
            .order_by(Interaction.date.asc(), Interaction.created_at.asc())
            .all()
        )
    except Exception:
        return jsonify({"error": "Failed to fetch interactions"}), 500

    return jsonify({"interactions": [i.to_dict() for i in rows]}), 200


@app.route("/api/contacts/<int:contact_id>/interactions", methods=["POST"])
def create_interaction(contact_id):
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    contact = _contact_owned_by(contact_id, user_id)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    itype = (data.get("type") or "").strip()
    notes = (data.get("notes") or "").strip()
    if not itype:
        return jsonify({"error": "Missing required field: type"}), 400
    if not notes:
        return jsonify({"error": "Missing required field: notes"}), 400

    interaction_dt = _parse_interaction_date(data.get("date"))
    if interaction_dt is None:
        return jsonify({"error": "Invalid date format"}), 400

    interaction = Interaction(
        contact_id=contact_id,
        type=itype,
        date=interaction_dt,
        notes=notes,
    )
    try:
        custom_fu = _parse_next_follow_up_override(data.get("next_follow_up"))
    except ValueError:
        return jsonify({"error": "Invalid next_follow_up date format"}), 400
    if custom_fu is not None:
        contact.next_follow_up = custom_fu
    else:
        contact.next_follow_up = interaction_dt + timedelta(days=30)
    db.session.add(interaction)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to save interaction"}), 500

    return (
        jsonify(
            {
                "interaction": interaction.to_dict(),
                "contact": contact.to_dict(),
            }
        ),
        201,
    )


@app.route("/api/interactions/<int:interaction_id>", methods=["DELETE"])
def delete_interaction(interaction_id):
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    row = Interaction.query.filter_by(id=interaction_id).first()
    if not row:
        return jsonify({"error": "Interaction not found"}), 404

    if not _contact_owned_by(row.contact_id, user_id):
        return jsonify({"error": "Interaction not found"}), 404

    try:
        db.session.delete(row)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to delete interaction"}), 500

    return jsonify({"message": "Deleted"}), 200


@app.route("/api/reminders", methods=["GET"])
def list_reminders():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=7)
    try:
        contacts = (
            Contact.query.filter(
                Contact.user_id == user_id,
                Contact.next_follow_up.isnot(None),
                Contact.next_follow_up <= cutoff,
            )
            .order_by(Contact.next_follow_up.asc())
            .all()
        )
    except Exception:
        return jsonify({"error": "Failed to fetch reminders"}), 500

    return jsonify({"contacts": [c.to_dict() for c in contacts]}), 200


@app.route("/api/applications", methods=["GET"])
def list_applications():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        rows = (
            Application.query.filter_by(user_id=user_id)
            .order_by(Application.created_at.desc())
            .all()
        )
    except Exception:
        return jsonify({"error": "Failed to fetch applications"}), 500
    return jsonify({"applications": [a.to_dict() for a in rows]}), 200


def _resolve_application_status(data: dict) -> str | None:
    """Return canonical status label, or None if invalid / missing."""
    raw = data.get("status")
    if raw is not None and str(raw).strip():
        s = str(raw).strip()
        if s in APPLICATION_STATUSES:
            return s
        return None
    stage = (data.get("stage") or "").strip().lower()
    if stage in STAGE_SLUG_TO_STATUS:
        return STAGE_SLUG_TO_STATUS[stage]
    return None


@app.route("/api/applications", methods=["POST"])
def create_application():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    firm_name = (data.get("firm_name") or data.get("firm") or "").strip()
    role = (data.get("role") or "").strip()
    if not firm_name or not role:
        return jsonify({"error": "Missing required field(s): firm_name, role"}), 400
    status = (data.get("status") or "Applied").strip()
    if status not in APPLICATION_STATUSES:
        return jsonify({"error": "Invalid status"}), 400
    row = Application(user_id=user_id, firm_name=firm_name, role=role, status=status)
    db.session.add(row)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create application"}), 500
    return jsonify({"application": row.to_dict()}), 201


@app.route("/api/applications/<int:application_id>", methods=["PUT", "PATCH", "DELETE"])
def application_detail(application_id):
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "DELETE":
        row = Application.query.filter_by(id=application_id, user_id=user_id).first()
        if not row:
            return jsonify({"error": "Application not found"}), 404
        try:
            db.session.delete(row)
            db.session.commit()
        except Exception:
            db.session.rollback()
            return jsonify({"error": "Failed to delete application"}), 500
        return jsonify({"message": "Deleted"}), 200

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    new_status = _resolve_application_status(data)
    if new_status is None:
        return jsonify({"error": "Invalid or missing status"}), 400
    row = Application.query.filter_by(id=application_id, user_id=user_id).first()
    if not row:
        return jsonify({"error": "Application not found"}), 404
    row.status = new_status
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update application"}), 500
    return jsonify({"application": row.to_dict()}), 200


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5001, debug=True)
