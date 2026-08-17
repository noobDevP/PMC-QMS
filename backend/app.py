import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, jsonify
from flask_cors import CORS
from models import db
from config import Config
from extensions import socketio

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, resources={r"/*": {"origins": "*"}})
socketio.init_app(app)

db.init_app(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/legacy-tv.html')
def serve_legacy_tv():
    return app.send_static_file('legacy-tv.html')

# Register Blueprints
from routes.auth_routes import auth_bp
from routes.kiosk_routes import kiosk_bp
from routes.teller_routes import teller_bp
from routes.admin_routes import admin_bp
from routes.tv_routes import tv_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(kiosk_bp, url_prefix='/api/kiosk')
app.register_blueprint(teller_bp, url_prefix='/api/teller')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(tv_bp, url_prefix='/api/tv')

# Init Scheduler
from scheduler import init_scheduler
init_scheduler(app)

from flask import send_from_directory

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, host='0.0.0.0', port=5000)
