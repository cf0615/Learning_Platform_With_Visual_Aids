from flask import Blueprint, render_template, session, redirect, url_for
import functools

# Create a blueprint for admin routes
admin_blueprint = Blueprint('admin', __name__)

# Check if the user is logged in as admin before accessing any page
def admin_login_required(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Debugging: Print session values to check if they exist
        print("Session Role (Admin View):", session.get('role'))
        print("Session UID (Admin View):", session.get('uid'))

        # Check if the user is logged in and is an admin
        if 'role' in session and session['role'] == 'admin':
            return func(*args, **kwargs)
        else:
            return redirect(url_for('home'))  # Redirect to home (login page) if not an admin
    return wrapper

# Route for admin dashboard
@admin_blueprint.route('/dashboard')
@admin_login_required
def admin_dashboard():
    return render_template('adminDashboard.html')

@admin_blueprint.route('/catalog')
@admin_login_required
def admin_catalog():
    return render_template('adminCatalog.html')

@admin_blueprint.route('/editCourse')
@admin_login_required
def admin_editCourse():
    return render_template('editCourse.html')

@admin_blueprint.route('/editModule')
@admin_login_required
def admin_editModule():
    return render_template('editModule.html')

@admin_blueprint.route('/notify')
@admin_login_required
def admin_notify():
    return render_template('adminNotify.html')

@admin_blueprint.route('/feedback')
@admin_login_required
def admin_feedback():
    return render_template('adminFeedback.html')

@admin_blueprint.route('/replyFeedback')
@admin_login_required
def admin_replyFeedback():
    return render_template('adminReplyFeedback.html')

@admin_blueprint.route('/lesson')
@admin_login_required
def admin_lesson():
    return render_template('lesson.html')

@admin_blueprint.route('/article')
@admin_login_required
def admin_article():
    return render_template('article.html')

@admin_blueprint.route('/quiz')
@admin_login_required
def admin_quiz():
    return render_template('quiz.html')

@admin_blueprint.route('/discussion')
@admin_login_required
def admin_discussion():
    return render_template('adminDiscussion.html')

@admin_blueprint.route('/post-details')
@admin_login_required
def admin_postDetail():
    return render_template('post-details.html')

#addNewPost
@admin_blueprint.route('/addNewPost')
@admin_login_required
def admin_addNewPost():
    return render_template('adminAddNewPost.html')