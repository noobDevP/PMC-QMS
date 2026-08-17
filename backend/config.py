import os

class Config:
    db_user = os.environ.get('DB_USER')
    db_pass = os.environ.get('DB_PASSWORD')
    db_host = os.environ.get('DB_HOST')
    db_name = os.environ.get('DB_NAME')
    
    if db_user and db_pass and db_host and db_name:
        db_url = f"mysql+pymysql://{db_user}:{db_pass}@{db_host}/{db_name}"
    else:
        db_url = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:0426@127.0.0.1/queue_prod_db'

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'super-secret-queue-key'
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024 # 50 MB max upload
