import tempfile
from flask import Flask, session, redirect, url_for, jsonify, render_template, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import timedelta
import json
import subprocess
import os
import sys

# Get the absolute path of the directory containing pg_logger.py
pg_logger_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/js/opt')

# Add this directory to sys.path so Python can find pg_logger
sys.path.append(pg_logger_path)
import pg_logger

# Import the blueprints
from main import user_blueprint
from admin import admin_blueprint

app = Flask(__name__)
app.secret_key = 'cf1234'  # Unique secret key for session management
CORS(app, supports_credentials=True)  # Allow credentials (like cookies) to be passed

# Initialize Firebase Admin SDK
cred = credentials.Certificate('./static/firebase/firebase_config.json')
firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

# Make sessions permanent and set their lifetime
app.permanent_session_lifetime = timedelta(minutes=60)

@app.before_request
def make_session_permanent():
    session.permanent = True  # Ensure session persistence across requests

@app.route('/')
def home():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

# Route to verify Firebase token and set session (this is where session should be set)
@app.route('/verify-token', methods=['POST'])
def verify_token():
    data = request.get_json()  # Get JSON data from the request
    id_token = data.get('idToken')

    try:
        # Verify the ID token with Firebase
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']

        # Debugging: Log the decoded token details
        print("Decoded Token:", decoded_token)

        # Retrieve user role from Firestore
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        # Print the entire Firestore user document for debugging
        if user_doc.exists:
            user_data = user_doc.to_dict()
            print("Firestore User Document:", user_data)  # Print the user data from Firestore
            
            role = user_data.get('role', 'user')  # Default to 'user' if no role is found

            # Store user role and uid in session
            session['role'] = role
            session['uid'] = uid

            # Debugging: Print session values to ensure they are set
            print("Session Role (Verify Token):", session.get('role'))
            print("Session UID (Verify Token):", session.get('uid'))

            return jsonify({'role': role}), 200  # Return JSON response with user role
        else:
            print("User document not found in Firestore.")
            return jsonify({'error': 'User not found'}), 404  # JSON error if user not found
    except Exception as e:
        # Debugging: Print the error to Flask logs
        print("Firebase Token Verification Failed:", str(e))
        return jsonify({'error': str(e)}), 401

# Register blueprints for user and admin views
app.register_blueprint(user_blueprint, url_prefix='/user')
app.register_blueprint(admin_blueprint, url_prefix='/admin')

@app.route("/run_code", methods=["POST"])
def run_code():
    try:
        code = request.json.get("code", "")
        lang = request.json.get("language", "python")  # Support both Python and Java

        if not code:
            return jsonify({"error": "No code provided"}), 400

        if lang == "python":
            # Existing Python code handling logic
            def flask_finalizer(input_code, output_trace):
                return {"code": input_code, "trace": output_trace}

            trace_output = pg_logger.exec_script_str_local(
                code,
                None,
                False,
                False,
                flask_finalizer
            )
            return jsonify(trace_output)

        elif lang == "java":
            # Java code handling logic using Docker
            docker_image = "pgbovine/cokapi-java:v1"
            docker_command = [
                "docker", "run", "-m", "512M", "--rm", "--user=netuser", "--net=none",
                "--cap-drop", "all", docker_image, 
                "/tmp/run-java-backend.sh", 
                json.dumps({"usercode": code, "options": {}, "args": [], "stdin": ""})
            ]
            result = subprocess.run(docker_command, capture_output=True, text=True)

            if result.returncode != 0:
                return jsonify({"error": result.stderr}), 500

            output = json.loads(result.stdout)
            return jsonify(output)
        elif lang == "javascript":
            # JavaScript code handling using jslogger.js
            # Create a temporary file to store the code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                # Run jslogger with the temporary file
                jslogger_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/js/jslogger.js')
                result = subprocess.run(
                    ['node', '--expose-debug-as=Debug', jslogger_path, '--jsondump=true', '--code=' + code],
                    capture_output=True,
                    text=True
                )

                if result.returncode != 0:
                    return jsonify({"error": result.stderr}), 500

                try:
                    output = json.loads(result.stdout)
                    return jsonify({"code": code, "trace": output})
                except json.JSONDecodeError:
                    return jsonify({"error": "Invalid output from JavaScript execution"}), 500

            finally:
                # Clean up the temporary file
                os.unlink(temp_file)
        elif lang == "ruby":
            # Ruby code handling using Docker
            docker_image = "pgbovine/cokapi-ruby:v1"
            docker_command = [
                "docker", "run", "-m", "512M", "--rm", 
                "--user=netuser", "--net=none", "--cap-drop", "all",
                docker_image, "/tmp/ruby/ruby", "/tmp/ruby/pg_logger.rb",
                "-c", code
            ]
            
            result = subprocess.run(docker_command, capture_output=True, text=True)

            if result.returncode != 0:
                return jsonify({"error": result.stderr}), 500

            try:
                output = json.loads(result.stdout)
                return jsonify({"code": code, "trace": output})
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid output from Ruby execution"}), 500
        else:
            return jsonify({"error": "Unsupported language"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)