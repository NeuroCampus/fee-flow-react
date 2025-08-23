# 🚀 Fee Management System - Complete Setup Guide

This guide will walk you through setting up the complete fee management system with both frontend and backend components.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **Python 3.8+** and pip
- **Git** for version control
- **Stripe Account** for payment processing
- **Code Editor** (VS Code recommended)

## 🏗️ Project Structure Overview

```
fee-flow-react/
├── src/                          # Frontend React application
│   ├── components/               # UI components
│   ├── pages/                   # Main page components
│   ├── lib/                     # API service and utilities
│   └── config/                  # Configuration files
├── college_fee_backend/          # Django backend application
│   ├── backend/                 # Main Django app
│   ├── manage.py                # Django management script
│   └── requirements.txt         # Python dependencies
├── package.json                 # Frontend dependencies
└── README.md                    # Project documentation
```

## 🔧 Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd fee-flow-react
```

### 2. Backend Setup (Django)

#### 2.1 Navigate to Backend Directory
```bash
cd college_fee_backend
```

#### 2.2 Create Virtual Environment
```bash
# On macOS/Linux
python3 -m venv env
source env/bin/activate

# On Windows
python -m venv env
env\Scripts\activate
```

#### 2.3 Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2.4 Run Database Migrations
```bash
python manage.py migrate
```

#### 2.5 Create Superuser
```bash
python manage.py createsuperuser
# Follow the prompts to create your admin account
```

#### 2.6 Start Backend Server
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup (React)

#### 3.1 Navigate to Project Root
```bash
cd ..  # Return to project root
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Environment Configuration
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

**Important**: Replace `pk_test_your_stripe_publishable_key_here` with your actual Stripe publishable key.

#### 3.4 Start Frontend Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔐 Initial Setup and Configuration

### 1. Access Admin Panel

1. Open your browser and go to `http://localhost:8000/admin`
2. Login with the superuser credentials you created
3. You'll see the Django admin interface

### 2. Create Initial Data

#### 2.1 Create Fee Components
1. Go to **Fee Components** in the admin panel
2. Add common fee components like:
   - Tuition Fee
   - Library Fee
   - Laboratory Fee
   - Examination Fee
   - Hostel Fee

#### 2.2 Create Fee Templates
1. Go to **Fee Templates** in the admin panel
2. Create templates for different departments and semesters
3. Assign fee components to each template

#### 2.3 Create Students
1. Go to **Students** in the admin panel
2. Add students with their details:
   - Name, USN, Department, Semester
   - Email and password for login

#### 2.4 Assign Fees to Students
1. Go to **Fee Assignments** in the admin panel
2. Assign fee templates to students
3. This will automatically generate invoices

## 💳 Stripe Payment Setup

### 1. Stripe Account Setup
1. Go to [stripe.com](https://stripe.com) and create an account
2. Navigate to **Developers > API keys**
3. Copy your **Publishable key** (starts with `pk_test_`)

### 2. Update Environment Variables
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

### 3. Configure Webhooks (Optional for Development)
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `http://localhost:8000/webhooks/stripe/`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## 🧪 Testing the System

### 1. Test Admin Login
1. Go to `http://localhost:3000/login`
2. Login with admin credentials
3. Verify you can access the admin dashboard

### 2. Test Student Login
1. Create a student account in the admin panel
2. Login with student credentials
3. Verify the student dashboard loads correctly

### 3. Test Payment Flow
1. As a student, try to make a payment
2. Use Stripe test card: `4242 4242 4242 4242`
3. Verify payment is recorded in the system

## 🚀 Production Deployment

### 1. Backend Deployment
```bash
# Update settings.py for production
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com']

# Use production database (PostgreSQL recommended)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Configure static files
STATIC_ROOT = '/path/to/static/files/'
MEDIA_ROOT = '/path/to/media/files/'
```

### 2. Frontend Deployment
```bash
# Build for production
npm run build

# Deploy the dist/ folder to your hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

### 3. Environment Variables (Production)
```env
VITE_API_BASE_URL=https://your-api-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Backend Connection Error
- Verify Django server is running on port 8000
- Check CORS settings in Django
- Ensure API_BASE_URL is correct

#### 2. Database Migration Errors
```bash
python manage.py makemigrations
python manage.py migrate
```

#### 3. Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Stripe Payment Issues
- Verify Stripe key is correct
- Check Stripe dashboard for errors
- Ensure webhook endpoints are configured

### Debug Mode
For development, you can enable debug mode:
```bash
# In Django settings
DEBUG = True

# In React
console.log('Debug info:', data)
```

## 📚 Additional Resources

### Documentation
- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Stripe API Documentation](https://stripe.com/docs/api)

### Support
- Check the main README.md for feature descriptions
- Review API endpoints in the backend/urls.py
- Check console logs for error messages

## ✅ Verification Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 3000
- [ ] Database migrations completed
- [ ] Superuser account created
- [ ] Environment variables configured
- [ ] Stripe keys configured
- [ ] Admin dashboard accessible
- [ ] Student dashboard accessible
- [ ] Payment flow working
- [ ] All CRUD operations functional

## 🎯 Next Steps

After successful setup:

1. **Customize Fee Components** for your institution
2. **Add More Students** and departments
3. **Configure Email Notifications** (if needed)
4. **Set up Automated Backups** for production
5. **Implement Additional Features** as required

---

**🎉 Congratulations! Your fee management system is now fully operational.**

For any issues or questions, please refer to the troubleshooting section or create an issue in the repository.
