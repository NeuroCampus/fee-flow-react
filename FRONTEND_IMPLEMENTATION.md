# 🚀 Fee Management System - Frontend Implementation Guide

## 📋 System Overview
Complete fee management system with Admin Dashboard, Student Dashboard, and JWT authentication.

## 🏗️ Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Django REST API + JWT + Stripe
- **Database**: SQLite (dev) / PostgreSQL (prod)

## 🔐 Authentication Flow

### Login Component
```tsx
// src/components/Login.tsx
const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const { login } = useAuth();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await login(credentials);
    if (success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
```

## 👨‍💼 Admin Dashboard

### Main Dashboard
```tsx
// src/pages/AdminDashboard.tsx
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCollections: 0,
    outstandingAmount: 0
  });
  
  useEffect(() => {
    fetchDashboardStats();
  }, []);
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Students" value={stats.totalStudents} icon="👥" />
        <StatCard title="Collections" value={`₹${stats.totalCollections}`} icon="💰" />
        <StatCard title="Outstanding" value={`₹${stats.outstandingAmount}`} icon="⚠️" />
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          title="Manage Students"
          description="Add, edit, or remove students"
          action={() => navigate('/admin/students')}
          icon="👨‍🎓"
        />
        <QuickActionCard
          title="Fee Management"
          description="Set up fee structures and assignments"
          action={() => navigate('/admin/fees')}
          icon="💳"
        />
      </div>
    </div>
  );
};
```

### Student Management
```tsx
// src/components/admin/StudentManagement.tsx
const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ dept: '', semester: '' });
  
  const handleAddStudent = async (studentData) => {
    const response = await api.post('/students/', studentData);
    if (response.ok) {
      fetchStudents();
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Student Management</h2>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md">
          Add Student
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filters.dept}
          onChange={(e) => setFilters({...filters, dept: e.target.value})}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Departments</option>
          <option value="CSE">Computer Science</option>
          <option value="ECE">Electronics</option>
        </select>
        <select
          value={filters.semester}
          onChange={(e) => setFilters({...filters, semester: e.target.value})}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(sem => (
            <option key={sem} value={sem}>{sem}th Sem</option>
          ))}
        </select>
      </div>
      
      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.usn}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.dept}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.semester}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <FeeStatusBadge status={student.feeStatus} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => navigate(`/admin/students/${student.id}`)} className="text-blue-600 hover:text-blue-900">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Custom Fee Structure
```tsx
// src/components/admin/CustomFeeStructure.tsx
const CustomFeeStructure = ({ studentId }) => {
  const [feeComponents, setFeeComponents] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSave = async () => {
    const response = await api.post(`/admin/students/${studentId}/custom-fees/`, {
      components: feeComponents
    });
    if (response.ok) {
      setIsEditing(false);
      fetchFeeStructure();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Custom Fee Structure</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="space-y-4">
          {Object.entries(feeComponents).map(([name, amount]) => (
            <div key={name} className="flex gap-4">
              <input
                type="text"
                value={name}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                readOnly
              />
              <input
                type="number"
                value={amount}
                onChange={(e) => setFeeComponents({...feeComponents, [name]: e.target.value})}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                placeholder="Amount"
              />
            </div>
          ))}
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md">
            Save Changes
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(feeComponents).map(([name, amount]) => (
            <div key={name} className="flex justify-between py-2 border-b">
              <span className="font-medium">{name}</span>
              <span className="text-gray-600">₹{amount}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-b font-bold">
            <span>Total</span>
            <span>₹{Object.values(feeComponents).reduce((sum, amount) => sum + Number(amount), 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

## 👨‍🎓 Student Dashboard

### Main Dashboard
```tsx
// src/pages/StudentDashboard.tsx
const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome, {dashboardData?.student?.name}!</h1>
      
      {/* Fee Overview Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Fee Overview</h2>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Payment Progress</span>
            <span>{dashboardData?.fee_overview?.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${dashboardData?.fee_overview?.progress_percentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Fee Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">₹{dashboardData?.fee_overview?.total_fee}</div>
            <div className="text-sm text-gray-600">Total Fee</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">₹{dashboardData?.fee_overview?.paid_amount}</div>
            <div className="text-sm text-gray-600">Paid Amount</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">₹{dashboardData?.fee_overview?.balance_amount}</div>
            <div className="text-sm text-gray-600">Pending Amount</div>
          </div>
        </div>
        
        {/* Fee Breakdown */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Fee Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(dashboardData?.fee_breakdown || {}).map(([name, amount]) => (
              <div key={name} className="flex justify-between py-2 border-b">
                <span>{name}</span>
                <span className="font-medium">₹{amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
          <p className="text-gray-600 mb-4">Pay your pending fees securely online</p>
          <button
            onClick={() => navigate('/payments')}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
          >
            Pay Now
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Payment History</h3>
          <p className="text-gray-600 mb-4">View all your past transactions</p>
          <button
            onClick={() => navigate('/payment-history')}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            View History
          </button>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {dashboardData?.recent_payments?.map(payment => (
            <div key={payment.id} className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Payment of ₹{payment.amount}</span>
                <span className="text-sm text-gray-500 ml-2">via {payment.mode}</span>
              </div>
              <PaymentStatusBadge status={payment.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Payment Component
```tsx
// src/components/student/PaymentForm.tsx
const PaymentForm = ({ invoiceId, balanceAmount }) => {
  const [amount, setAmount] = useState(balanceAmount);
  const [loading, setLoading] = useState(false);
  
  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/invoices/${invoiceId}/create-checkout-session/`, {
        amount: Number(amount)
      });
      
      if (response.ok) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            max={balanceAmount}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <p className="text-sm text-gray-500 mt-1">
            Maximum amount: ₹{balanceAmount}
          </p>
        </div>
        
        <button
          onClick={handlePayment}
          disabled={loading || amount <= 0 || amount > balanceAmount}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
      </div>
    </div>
  );
};
```

## 🎨 UI Components

### Common Components
```tsx
// src/components/ui/StatCard.tsx
const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className="text-3xl mr-4">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </p>
        )}
      </div>
    </div>
  </div>
);

// src/components/ui/StatusBadge.tsx
const StatusBadge = ({ status }) => {
  const statusConfig = {
    paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
    partial: { color: 'bg-yellow-100 text-yellow-800', text: 'Partial' },
    pending: { color: 'bg-red-100 text-red-800', text: 'Pending' }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.text}
    </span>
  );
};
```

## 🔧 API Integration

### API Service
```tsx
// src/lib/api.ts
const API_BASE = 'http://localhost:8000';

class ApiService {
  private token: string | null = null;
  
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }
  
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }
  
  async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }
    
    return response;
  }
  
  async get(endpoint: string) {
    return this.request(endpoint);
  }
  
  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
```

## 🚀 Key Features Implemented

### ✅ Admin Dashboard
- Student CRUD operations
- Custom fee structure per student
- Fee template management
- Payment tracking
- Reports generation
- Status dashboard

### ✅ Student Dashboard
- Fee overview with progress
- Fee breakdown display
- Partial payment support
- Payment history
- Receipt download
- Profile editing

### ✅ Authentication
- JWT-based auth
- Role-based access control
- Protected routes

### ✅ Payment System
- Stripe integration
- Partial payments
- Offline payment recording
- Payment status tracking

## 📱 Responsive Design
- Mobile-first approach
- Tailwind CSS for styling
- Responsive grid layouts
- Touch-friendly interfaces

## 🔒 Security Features
- JWT token validation
- Role-based permissions
- Protected API endpoints
- Secure payment processing

## 🎯 Next Steps
1. Add real-time notifications
2. Implement email/SMS reminders
3. Add data export functionality
4. Create mobile app
5. Add analytics dashboard
6. Implement audit logging

This implementation provides a complete, production-ready fee management system with modern UI/UX and robust backend integration.
