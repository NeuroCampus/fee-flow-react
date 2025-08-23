import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LogOut, Users, FileText, CreditCard, BarChart3, Tag, BookText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { name: 'Students', icon: Users, path: '/admin/students' },
  { name: 'Fee Components', icon: Tag, path: '/admin/fee-components' },
  { name: 'Fee Templates', icon: BookText, path: '/admin/fee-templates' },
  { name: 'Fee Assignments', icon: FileText, path: '/admin/fee-assignments' },
  { name: 'Payments', icon: CreditCard, path: '/admin/payments' },
  { name: 'Reports', icon: BarChart3, path: '/admin/reports' },
];

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar for larger screens */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                  isActive ? 'bg-muted text-primary' : ''
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
          <Separator className="my-2" />
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>
      </aside>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64">
        {/* Header for mobile and larger screens */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                        isActive ? 'bg-muted text-primary' : ''
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                ))}
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          {/* Add user info / profile in header later */}
          <div className="flex-1"></div> {/* Pushes content to the right */}
          {/* <span className="text-sm font-medium">Welcome, Admin!</span> */}
        </header>

        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
