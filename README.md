# 🚀 Fee Management System - Complete Implementation

A comprehensive fee management system built with React + TypeScript frontend and Django REST API backend, featuring role-based access control, Stripe payment integration, and real-time fee tracking.

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication system
- Role-based access control (Admin, HOD, Student)
- Secure login/logout with token refresh
- Protected routes and API endpoints

### 👨‍💼 Admin Dashboard
- **Student Management**: CRUD operations for students
- **Fee Components**: Create and manage fee components (tuition, library, etc.)
- **Fee Templates**: Design fee structures for departments/semesters
- **Fee Assignments**: Assign fee templates to individual students
- **Payment Tracking**: Monitor online and offline payments
- **Reports**: Outstanding fees, collection reports, and analytics
- **Custom Fee Structures**: Override default fees for specific students

### 👨‍🎓 Student Dashboard
- **Fee Overview**: Visual progress bar and payment status
- **Fee Breakdown**: Detailed component-wise fee structure
- **Invoice Management**: View all invoices and payment history
- **Online Payments**: Secure Stripe integration for fee payments
- **Receipt Download**: Download payment receipts as PDF
- **Notifications**: Real-time updates and reminders
- **Profile Management**: Update personal information

### 🎓 HOD Dashboard
- **Department Overview**: Student count, collection rates, outstanding amounts
- **Semester-wise Analysis**: Fee collection status by semester
- **Student List**: View all students in the department
- **Export Reports**: Generate department-wise reports
- **Performance Metrics**: Collection rate tracking and targets

### 💳 Payment System
- **Stripe Integration**: Secure online payment processing
- **Offline Payments**: Record cash, DD, and NEFT payments
- **Partial Payments**: Support for installment-based payments
- **Payment History**: Complete transaction records
- **Receipt Generation**: Automated PDF receipt creation

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Query** for state management
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Django 4** with Django REST Framework
- **JWT Authentication** with refresh tokens
- **Stripe API** integration
- **SQLite** (development) / **PostgreSQL** (production)
- **Custom user model** with role-based permissions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.8+ and pip
- Stripe account (for payment processing)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd fee-flow-react
```

### 2. Backend Setup
```bash
cd college_fee_backend
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend Setup
```bash
# From the root directory
npm install
npm run dev
```

### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

## 📁 Project Structure

```
fee-flow-react/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Layout components
│   ├── lib/                # API service and utilities
│   ├── pages/              # Main page components
│   └── config/             # Configuration files
├── college_fee_backend/     # Django backend
│   ├── backend/            # Main Django app
│   │   ├── models.py       # Database models
│   │   ├── views.py        # API views
│   │   ├── urls.py         # URL routing
│   │   └── serializers.py  # Data serialization
│   └── requirements.txt     # Python dependencies
└── README.md               # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/login/` - User login
- `POST /auth/register/` - User registration
- `POST /auth/logout/` - User logout
- `GET /auth/me/` - Get current user

### Student Endpoints
- `GET /api/student/dashboard/` - Student dashboard data
- `PATCH /api/student/profile/edit/` - Update student profile
- `GET /payments/` - Get payment history
- `POST /invoices/{id}/create-checkout-session/` - Create Stripe session

### Admin Endpoints
- `GET /students/` - List all students
- `POST /students/` - Create new student
- `GET /fee/components/` - List fee components
- `GET /admin/fee-assignments/` - List fee assignments
- `GET /admin/reports/outstanding/` - Outstanding fees report

### HOD Endpoints
- `GET /hod/students/` - Department students
- `GET /hod/reports/` - Department reports

## 🎨 UI Components

The system uses a comprehensive set of UI components built with Shadcn/ui:

- **Cards**: Information display and organization
- **Tables**: Data presentation with sorting and filtering
- **Forms**: Input validation and user interaction
- **Modals**: Overlay dialogs for actions
- **Badges**: Status indicators and labels
- **Progress Bars**: Visual progress representation
- **Buttons**: Action triggers with various styles

## 🔒 Security Features

- **JWT Tokens**: Secure authentication with refresh mechanism
- **Role-based Access**: Granular permission control
- **API Protection**: Secure endpoints with token validation
- **Input Validation**: Server-side data validation
- **CORS Configuration**: Proper cross-origin resource sharing

## 💳 Payment Integration

### Stripe Setup
1. Create a Stripe account
2. Get your publishable and secret keys
3. Configure webhook endpoints
4. Test with Stripe test cards

### Payment Flow
1. Student selects invoice for payment
2. System creates Stripe checkout session
3. Student completes payment on Stripe
4. Webhook confirms payment success
5. System updates payment records
6. Receipt is generated automatically


 ## WeasyPrint system dependencies (GTK and related libraries) required for PDF rendering on Windows. These are not installed by pip and must be added separately.

To fix this on Windows:

1. Download and install the GTK3 runtime:
Go to: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
2. Download the latest gtk3-runtime installer (e.g., gtk3-runtime-3.24.38-2022-12-27-tschoonj-installer.exe).
Run the installer and follow the instructions.
3. After installation, add the GTK bin folder (e.g., C:\Program Files\GTK3-Runtime Win64\bin) to your system PATH environment variable.
4. Restart your terminal and try running your Django server again.



## 📊 Reporting & Analytics

### Admin Reports
- **Outstanding Fees**: Students with pending payments
- **Collection Reports**: Payment collection analytics
- **Student Status**: Academic status tracking
- **Custom Fee Analysis**: Individual student fee structures

### HOD Reports
- **Department Performance**: Collection rates and targets
- **Semester Analysis**: Fee collection by semester
- **Student Overview**: Department student statistics

## 🚀 Deployment

### Frontend Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### Backend Deployment
```bash
# Configure production settings
# Set DEBUG=False and ALLOWED_HOSTS
# Use production database (PostgreSQL)
# Configure static files and media
```

## 🧪 Testing

### Backend Testing
```bash
cd college_fee_backend
python manage.py test
```

### Frontend Testing
```bash
npm run test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- **Real-time Notifications**: WebSocket integration
- **Mobile App**: React Native implementation
- **Advanced Analytics**: Charts and graphs
- **Email/SMS Integration**: Automated reminders
- **Multi-language Support**: Internationalization
- **Audit Logging**: Complete action tracking
- **API Documentation**: Swagger/OpenAPI specs

---

**Built with ❤️ using React, TypeScript, Django, and modern web technologies**







# College Fee Management System - Backend

A comprehensive Django REST API backend for managing college fee payments with Stripe integration.

## 🚀 Features

- **User Management**: Student, Admin, and HOD roles with JWT authentication
- **Fee Management**: Flexible fee structures with components and templates
- **Invoice Generation**: Automated invoice creation with unique numbering
- **Stripe Integration**: Secure online payments with webhook handling
- **Receipt Generation**: PDF receipts with customizable templates
- **Payment Tracking**: Complete payment history and status tracking
- **Dashboard Analytics**: Comprehensive reporting for admins and HODs
- **Notification System**: Real-time notifications for users

## 🛠️ Tech Stack

- **Backend**: Django 4.2+ with Django REST Framework
- **Database**: SQLite (default) / PostgreSQL (production)
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Stripe API
- **PDF Generation**: xhtml2pdf
- **Environment**: Python virtual environment

## � Default Users

After running the setup script, the following users are available:

- **Admin User**: `admin@example.com` / `admin123`
- **Test Students**: 
  - `john.doe@example.com` / `student123`
  - `jane.smith@example.com` / `student123`
  - `bob.johnson@example.com` / `student123`

## �📋 Prerequisites

- Python 3.8+
- pip (Python package manager)
- Git

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd college_fee_backend

# Run the automated setup script
./setup.sh
```

### 2. Manual Setup (Alternative)

```bash
# Create virtual environment
python3 -m venv env
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Stripe keys

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 3. Configure Environment Variables

Update the `.env` file with your actual values:

```env
# Django settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Run the Server

```bash
# Activate virtual environment
source env/bin/activate

# Start development server
python manage.py runserver
```

The API will be available at: `http://localhost:8000`

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/login/` - User login
- `POST /auth/register/` - User registration
- `POST /auth/logout/` - User logout
- `GET /auth/me/` - Get current user info

### Student Endpoints

- `GET /api/student/dashboard/` - Student dashboard data
- `GET /invoices/` - List student invoices
- `GET /invoices/{id}/` - Invoice details
- `GET /api/student/payments/` - Payment history
- `GET /api/student/receipts/` - Receipt history
- `GET /notifications/` - User notifications

### Admin Endpoints

- `GET/POST /students/` - Manage students
- `GET/POST /fee/components/` - Manage fee components
- `GET/POST /fee/templates/` - Manage fee templates
- `GET/POST /admin/invoices/` - Manage invoices
- `GET/POST /payments/` - Manage payments
- `POST /payments/offline/` - Record offline payments

### Stripe Integration

- `POST /invoices/{id}/create-checkout-session/` - Create payment session
- `GET /payments/{session_id}/status/` - Check payment status
- `POST /webhooks/stripe/` - Stripe webhook handler
- `POST /payments/{id}/refund/` - Process refunds

## 🗄️ Database Models

### Core Models

- **User**: Custom user model with roles (student, admin, hod)
- **StudentProfile**: Extended profile for students with admission mode tracking (KCET, COMED-K, Management, etc.)
- **FeeComponent**: Individual fee components (tuition, library, etc.)
- **FeeTemplate**: Templates combining multiple components
- **Invoice**: Generated invoices for students
- **Payment**: Payment records with Stripe integration
- **Receipt**: Generated PDF receipts
- **Notification**: User notifications

### Relationships

```
User (1) ─── (1) StudentProfile
StudentProfile (1) ─── (N) Invoice
Invoice (1) ─── (N) Payment
Payment (1) ─── (1) Receipt
FeeTemplate (N) ─── (N) FeeComponent
```

## 🎓 Admission Modes

The system supports tracking different admission modes for students:

- **KCET**: Karnataka Common Entrance Test
- **COMED-K**: Consortium of Medical, Engineering and Dental Colleges of Karnataka
- **Management**: Management quota admission
- **JEE**: Joint Entrance Examination
- **Diploma**: Diploma holders (lateral entry)
- **Lateral**: Lateral entry students
- **Other**: Other admission modes

## 🔧 Configuration

### Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoint for `http://yourdomain.com/webhooks/stripe/`
4. Update `.env` with your keys

### Production Deployment

1. Set `DEBUG=False` in `.env`
2. Use a production database (PostgreSQL recommended)
3. Set up proper `ALLOWED_HOSTS`
4. Configure HTTPS
5. Set up Stripe webhook endpoint with proper secret

## 🧪 Testing

### Run Tests

```bash
# Run all tests
python manage.py test

# Run specific test file
python manage.py test backend.tests.test_stripe_integration
```

### Test Stripe Integration

```bash
# Run Stripe integration tests
python test_stripe_integration.py
```

## 📁 Project Structure

```
college_fee_backend/
├── backend/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py          # Database models
│   ├── serializers.py     # DRF serializers
│   ├── views.py          # API views
│   ├── urls.py           # URL routing
│   ├── settings.py       # Django settings
│   ├── stripe_service.py # Stripe integration
│   ├── wsgi.py
│   └── templates/        # HTML templates
│       └── receipt_template.html
├── logs/                 # Application logs
├── receipts/            # Generated PDF receipts
├── env/                 # Virtual environment
├── .env                 # Environment variables
├── manage.py
├── requirements.txt
├── setup.sh            # Setup script
└── README.md
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control
- CORS protection
- Secure Stripe webhook verification
- Input validation and sanitization
- SQL injection prevention

## 📊 Monitoring & Logging

- Comprehensive logging to `logs/stripe.log`
- Payment tracking and audit trails
- Error handling with detailed messages
- Performance monitoring capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](../../issues) page
- Review the [STRIPE_INTEGRATION_GUIDE.md](STRIPE_INTEGRATION_GUIDE.md)
- Check the [SETUP_GUIDE.md](../../SETUP_GUIDE.md) in the root directory

## 🔄 API Versioning

Current API version: v1

All endpoints are prefixed with appropriate paths for future versioning support.
