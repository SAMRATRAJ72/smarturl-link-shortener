
from flask import Flask, request, jsonify, redirect, send_file, send_from_directory
from io import BytesIO
import os
import sqlite3
import secrets
import string
from urllib.parse import urlparse
import qrcode

app = Flask(__name__)

DATABASE = os.path.join(app.root_path, "smarturl.db")


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_db() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT UNIQUE NOT NULL,
                original_url TEXT NOT NULL
            )
        """)


def generate_code(length=6):
    characters = string.ascii_letters + string.digits
    return "".join(secrets.choice(characters) for _ in range(length))


@app.route("/")
def home():
    return send_from_directory(app.root_path, "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(app.root_path, "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(app.root_path, "script.js")


@app.route("/api/shorten", methods=["POST"])
def shorten_url():
    data = request.get_json(silent=True) or {}
    original_url = data.get("url", "").strip()

    parsed_url = urlparse(original_url)

    if parsed_url.scheme not in ("http", "https") or not parsed_url.hostname:
        return jsonify({"error": "Please enter a valid HTTP or HTTPS URL."}), 400

    with get_db() as connection:
        while True:
            code = generate_code()
            existing = connection.execute(
                "SELECT id FROM urls WHERE short_code = ?", (code,)
            ).fetchone()

            if existing is None:
                break

        connection.execute(
            "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
            (code, original_url)
        )

    return jsonify({
        "short_url": request.host_url + code,
        "original_url": original_url
    })


@app.route("/qr-code")
def generate_qr_code():
    url = request.args.get("url", "").strip()
    parsed_url = urlparse(url)

    if parsed_url.scheme not in ("http", "https") or not parsed_url.hostname:
        return jsonify({"error": "Please enter a valid HTTP or HTTPS URL."}), 400

    image = qrcode.make(url)
    image_buffer = BytesIO()
    image.save(image_buffer, format="PNG")
    image_buffer.seek(0)
    return send_file(image_buffer, mimetype="image/png", download_name="smarturl-qr.png")


@app.route("/<short_code>")
def redirect_url(short_code):
    with get_db() as connection:
        result = connection.execute(
            "SELECT original_url FROM urls WHERE short_code = ?",
            (short_code,)
        ).fetchone()

    if result is None:
        return "Short URL not found.", 404

    return redirect(result["original_url"])


initialize_database()


if __name__ == "__main__":
    app.run(debug=True)
