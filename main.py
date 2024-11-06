from flask import Blueprint, render_template, session, redirect, url_for
import functools

# Create a blueprint for user routes
user_blueprint = Blueprint('user', __name__)

# Check if the user is logged in before accessing any page
def login_required(func):
    @functools.wraps(func)  # Ensure the original function name is preserved
    def wrapper(*args, **kwargs):
        if 'role' in session and session['role'] == 'user':
            return func(*args, **kwargs)
        else:
            return redirect(url_for('home'))
    return wrapper

# Route for user dashboard
@user_blueprint.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

# Route for my courses page
@user_blueprint.route('/mycourse')
@login_required
def mycourse():
    return render_template('mycourse.html')

# Route for lesson page
@user_blueprint.route('/lesson')
@login_required
def lesson():
    return render_template('lesson.html')

# Route for discussion page
@user_blueprint.route('/discussion')
@login_required
def discussion():
    return render_template('discussion.html')

# Route for article page
@user_blueprint.route('/article')
@login_required
def article():
    return render_template('article.html')

# Route for journey page
@user_blueprint.route('/journey')
@login_required
def journey():
    return render_template('journey.html')

# Route for quiz page
@user_blueprint.route('/quiz')
@login_required
def quiz():
    return render_template('quiz.html')

# Route for post details page
@user_blueprint.route('/post-details')
@login_required
def post_details():
    return render_template('post-details.html')

# Route for add new post page
@user_blueprint.route('/addNewPost')
@login_required
def add_new_post():
    return render_template('addNewPost.html')

@user_blueprint.route('/catalog')
@login_required
def catalog():
    return render_template('catalog.html')

@user_blueprint.route('/feedback')
@login_required
def feedback():
    return render_template('feedback.html')

@user_blueprint.route('/editPost')
@login_required
def editPost():
    return render_template('editPost.html')