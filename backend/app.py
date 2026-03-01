"""Flask app: CORS, DB, auth routes."""
import os
from flask import Flask, jsonify
from flask_cors import CORS

from config import DATABASE_URL, SECRET_KEY
from models import db

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = SECRET_KEY

CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

db.init_app(app)

from routes.auth import auth_bp

app.register_blueprint(auth_bp)


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5001, debug=True)
