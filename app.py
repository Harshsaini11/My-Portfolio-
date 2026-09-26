import os
import random
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
from pymongo import MongoClient
from bson.objectid import ObjectId


app = Flask(__name__)
app.secret_key = os.urandom(24)

# File Upload Configuration (PDF Support Added)
UPLOAD_FOLDER = os.path.join('static', 'assets')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS

# MongoDB Database Setup

MONGO_URI = (
    "mongodb+srv://portfolio:harsh2005"
    "@harsh.1fyrvee.mongodb.net/?retryWrites=true&w=majority&appName=harsh"
)

client = MongoClient(MONGO_URI)
db = client['Portfolio']

# MongoDB Collections
content_col = db['content']
projects_col = db['projects']
internships_col = db['internships']
admin_col = db['admin']
experience_col = db['experience']
services_col = db['services']


def serialize_doc(doc):
    if not doc:
        return None
    doc['id'] = str(doc.pop('_id'))
    return doc


def init_db():
    if not admin_col.find_one({'username': 'admin'}):
        hashed_pw = generate_password_hash('admin123')
        admin_col.insert_one({
            'username': 'admin',
            'password_hash': hashed_pw
        })


init_db()

# Email Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'Harshsaini2452005@gmail.com'
app.config['MAIL_PASSWORD'] = 'mlkxrewpepqxccpo'

mail = Mail(app)

otp_store = {}

# --- Routes ---
@app.route('/')
def index():
    row = content_col.find_one({'key_name': 'hero_profile_img'})
    profile_img = (
        row['content_value'] if row else '/static/assets/profile.jpg'
    )
    return render_template(
        'index.html', is_admin=False, profile_img=profile_img
    )

@app.route('/admin')
def admin_page():
    if not session.get('is_admin'):
        return render_template('admin_login.html')
    return render_template('index.html', is_admin=True)


@app.route('/api/admin/update-password', methods=['POST'])
def update_password():
    if not session.get('is_admin'):
        return jsonify({
            'status': 'unauthorized',
            'message': 'Admin login required'
        }), 401

    data = request.json or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({
            'status': 'error',
            'message': 'All fields are required'
        }), 400

    admin = admin_col.find_one({'username': 'admin'})

    if admin and check_password_hash(
        admin['password_hash'], current_password
    ):
        new_hashed_pw = generate_password_hash(new_password)
        admin_col.update_one(
            {'username': 'admin'},
            {'$set': {'password_hash': new_hashed_pw}}
        )
        return jsonify({
            'status': 'success',
            'message': 'Password updated successfully!'
        })

    return jsonify({
        'status': 'error',
        'message': 'Incorrect current password'
    }), 400


@app.route('/api/admin/forgot-password', methods=['POST'])
def forgot_password():
    otp = str(random.randint(100000, 999999))
    otp_store['admin_otp'] = otp

    msg = Message(
        subject="Admin Password Reset OTP - Portfolio",
        sender=app.config['MAIL_USERNAME'],
        recipients=['Harshsaini2452005@gmail.com']
    )
    msg.body = (
        f"Your Password Reset OTP is: {otp}\n\n"
        "If you did not request this, please ignore."
    )

    try:
        mail.send(msg)
        return jsonify({
            'status': 'success',
            'message': 'OTP sent to registered email!'
        })
    except Exception as e:
        print(e)
        return jsonify({
            'status': 'error',
            'message': 'Failed to send OTP email.'
        }), 500


@app.route('/api/admin/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    entered_otp = data.get('otp')
    new_password = data.get('new_password')

    if otp_store.get('admin_otp') and otp_store['admin_otp'] == entered_otp:
        new_hashed_pw = generate_password_hash(new_password)
        admin_col.update_one(
            {'username': 'admin'},
            {'$set': {'password_hash': new_hashed_pw}}
        )
        otp_store.pop('admin_otp', None)
        return jsonify({
            'status': 'success',
            'message': 'Password reset successfully! You can now login.'
        })

    return jsonify({
        'status': 'error',
        'message': 'Invalid or expired OTP'
    }), 400


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    admin = admin_col.find_one({'username': data.get('username')})

    if admin and check_password_hash(
        admin['password_hash'], data.get('password')
    ):
        session['is_admin'] = True
        return jsonify({'status': 'success'})
    return jsonify({
        'status': 'error',
        'message': 'Invalid Username or Password'
    }), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('is_admin', None)
    return jsonify({'status': 'success'})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if not session.get('is_admin'):
            return jsonify({
                'status': 'unauthorized',
                'message': 'Admin login required'
            }), 401

        file_key = None
        if 'file' in request.files:
            file_key = 'file'
        elif 'image' in request.files:
            file_key = 'image'

        if not file_key:
            return jsonify({
                'status': 'error',
                'message': 'No file uploaded'
            }), 400

        file = request.files[file_key]
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400

        if allowed_file(file.filename):
            filename = secure_filename(file.filename)
            ext = os.path.splitext(filename)[1].lower()
            base_name = os.path.splitext(filename)[0]
            unique_filename = f"{base_name}_{os.urandom(4).hex()}{ext}"

            filepath = os.path.join(
                app.config['UPLOAD_FOLDER'], unique_filename
            )
            file.save(filepath)
            return jsonify({
                'status': 'success',
                'file_url': f"/static/assets/{unique_filename}"
            })

        return jsonify({
            'status': 'error',
            'message': 'Invalid file format'
        }), 400
    except Exception as e:
        print("Upload Server Exception:", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/content', methods=['GET'])
def get_content():
    rows = list(content_col.find())
    content = {row['key_name']: row['content_value'] for row in rows}
    return jsonify(content)


@app.route('/api/content/save', methods=['POST'])
def save_content():
    try:
        if not session.get('is_admin'):
            return jsonify({
                'status': 'unauthorized',
                'message': 'Admin login required'
            }), 401

        data = request.json or {}
        for key, value in data.items():
            content_col.update_one(
                {'key_name': key},
                {'$set': {'content_value': value}},
                upsert=True
            )

        return jsonify({
            'status': 'success',
            'message': 'All changes saved live!'
        })
    except Exception as e:
        print("Save Content Exception:", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500


def sanitize_image_url(url_str):
    if not url_str:
        return '/static/assets/default-project.png'

    url_str = url_str.strip()
    if 'static' in url_str:
        static_index = url_str.find('static')
        cleaned_path = url_str[static_index:].replace('\\', '/')
        return '/' + cleaned_path

    if url_str.startswith(('http://', 'https://', '//', '/')):
        return url_str

    return url_str


@app.route('/api/projects', methods=['GET', 'POST'])
def manage_projects():
    if request.method == 'GET':
        projects = [
            serialize_doc(p) for p in projects_col.find().sort('_id', -1)
        ]
        return jsonify(projects)

    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    data = request.json or {}
    tech_stack = data.get('tech_stack', '')
    if isinstance(tech_stack, list):
        tech_stack_str = ','.join(tech_stack)
    else:
        tech_stack_str = str(tech_stack)

    clean_image_url = sanitize_image_url(data.get('image_url', ''))

    projects_col.insert_one({
        'title': data.get('title'),
        'description': data.get('description'),
        'tech_stack': tech_stack_str,
        'image_url': clean_image_url,
        'github_url': data.get('github_url'),
        'demo_url': data.get('demo_url', '#')
    })

    return jsonify({'status': 'success'})


@app.route('/api/projects/<project_id>', methods=['PUT', 'DELETE'])
def update_or_delete_project(project_id):
    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    try:
        obj_id = ObjectId(project_id)
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Invalid ID format'
        }), 400

    if request.method == 'DELETE':
        projects_col.delete_one({'_id': obj_id})
    elif request.method == 'PUT':
        data = request.json or {}
        tech_stack = data.get('tech_stack', '')
        if isinstance(tech_stack, list):
            tech_stack_str = ','.join(tech_stack)
        else:
            tech_stack_str = str(tech_stack)

        clean_image_url = sanitize_image_url(data.get('image_url', ''))

        projects_col.update_one(
            {'_id': obj_id},
            {'$set': {
                'title': data.get('title'),
                'description': data.get('description'),
                'tech_stack': tech_stack_str,
                'image_url': clean_image_url,
                'github_url': data.get('github_url'),
                'demo_url': data.get('demo_url', '#')
            }}
        )

    return jsonify({'status': 'success'})


@app.route('/api/internships', methods=['GET', 'POST'])
def manage_internships():
    if request.method == 'GET':
        internships = [
            serialize_doc(i) for i in internships_col.find().sort('_id', -1)
        ]
        return jsonify(internships)

    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    data = request.json or {}
    technologies = data.get('technologies', '')
    if isinstance(technologies, list):
        tech_str = ','.join(technologies)
    else:
        tech_str = str(technologies)

    internships_col.insert_one({
        'role': data.get('role'),
        'company': data.get('company'),
        'duration': data.get('duration'),
        'description': data.get('description'),
        'technologies': tech_str,
        'certificate_link': data.get('certificate_link', '#'),
        'offer_letter_link': data.get('offer_letter_link', '#')
    })
    return jsonify({'status': 'success'})


@app.route('/api/internships/<intern_id>', methods=['PUT', 'DELETE'])
def update_or_delete_internship(intern_id):
    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    try:
        obj_id = ObjectId(intern_id)
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Invalid ID format'
        }), 400

    if request.method == 'DELETE':
        internships_col.delete_one({'_id': obj_id})
    elif request.method == 'PUT':
        data = request.json or {}
        technologies = data.get('technologies', '')
        if isinstance(technologies, list):
            tech_str = ','.join(technologies)
        else:
            tech_str = str(technologies)

        internships_col.update_one(
            {'_id': obj_id},
            {'$set': {
                'role': data.get('role'),
                'company': data.get('company'),
                'duration': data.get('duration'),
                'description': data.get('description'),
                'technologies': tech_str,
                'certificate_link': data.get('certificate_link', '#'),
                'offer_letter_link': data.get('offer_letter_link', '#')
            }}
        )

    return jsonify({'status': 'success'})


@app.route('/api/experience', methods=['GET', 'POST'])
def manage_experience():
    if request.method == 'GET':
        exp_list = [
            serialize_doc(i) for i in experience_col.find().sort('_id', 1)
        ]
        return jsonify(exp_list)

    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    data = request.json or {}
    experience_col.insert_one({
        'icon': data.get('icon', 'fa-briefcase'),
        'title': data.get('title'),
        'subtitle': data.get('subtitle', ''),
        'description': data.get('description', ''),
        'points': data.get('points', ''),
        'tag': data.get('tag', '')
    })
    return jsonify({'status': 'success'})


@app.route('/api/experience/<exp_id>', methods=['PUT', 'DELETE'])
def update_or_delete_experience(exp_id):
    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    try:
        obj_id = ObjectId(exp_id)
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Invalid ID format'
        }), 400

    if request.method == 'DELETE':
        experience_col.delete_one({'_id': obj_id})
    elif request.method == 'PUT':
        data = request.json or {}
        experience_col.update_one(
            {'_id': obj_id},
            {'$set': {
                'icon': data.get('icon', 'fa-briefcase'),
                'title': data.get('title'),
                'subtitle': data.get('subtitle', ''),
                'description': data.get('description', ''),
                'points': data.get('points', ''),
                'tag': data.get('tag', '')
            }}
        )

    return jsonify({'status': 'success'})


@app.route('/api/services', methods=['GET', 'POST'])
def manage_services():
    if request.method == 'GET':
        services = [
            serialize_doc(i) for i in services_col.find().sort('_id', 1)
        ]
        return jsonify(services)

    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    data = request.json or {}
    services_col.insert_one({
        'icon': data.get('icon', 'fa-code'),
        'title': data.get('title'),
        'description': data.get('description')
    })
    return jsonify({'status': 'success'})


@app.route('/api/services/<service_id>', methods=['PUT', 'DELETE'])
def update_or_delete_service(service_id):
    if not session.get('is_admin'):
        return jsonify({'status': 'unauthorized'}), 401

    try:
        obj_id = ObjectId(service_id)
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Invalid ID format'
        }), 400

    if request.method == 'DELETE':
        services_col.delete_one({'_id': obj_id})
    elif request.method == 'PUT':
        data = request.json or {}
        services_col.update_one(
            {'_id': obj_id},
            {'$set': {
                'icon': data.get('icon', 'fa-code'),
                'title': data.get('title'),
                'description': data.get('description')
            }}
        )

    return jsonify({'status': 'success'})


@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.json or {}
    name = data.get('name')
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')

    msg = Message(
        subject=f"Portfolio Contact: {subject}",
        sender=app.config['MAIL_USERNAME'],
        recipients=['Harshsaini2452005@gmail.com']
    )
    msg.body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"

    try:
        mail.send(msg)
        return jsonify({
            'status': 'success',
            'message': 'Email sent successfully!'
        })
    except Exception as e:
        print(e)
        return jsonify({
            'status': 'error',
            'message': 'Failed to send email.'
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
