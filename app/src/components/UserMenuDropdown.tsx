import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { User, Store, LogOut } from 'lucide-react';

export default function UserMenuDropdown() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="relative group">
        {/* Trigger Icon */}
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          aria-label="User menu"
        >
          <User className="w-5 h-5 text-gray-600" />
        </button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          {/* Invisible Bridge - prevents menu from closing when moving mouse from icon to menu */}
          <div className="h-4 w-full absolute top-0 left-0" />
          
          {/* Dropdown Content */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[140px]">
            <Link
              to="/login"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show different menu for vendors
  const isVendor = user?.role === 'vendor';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="relative group">
      {/* Trigger Icon */}
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
        aria-label="User menu"
      >
        <User className="w-5 h-5 text-gray-600" />
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {/* Invisible Bridge - prevents menu from closing when moving mouse from icon to menu */}
        <div className="h-4 w-full absolute top-0 left-0" />
        
        {/* Dropdown Content */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          
          {/* Role-specific links */}
          {isVendor && (
            <Link
              to="/vendors"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            >
              <Store className="h-4 w-4" />
              Vendor Dashboard
            </Link>
          )}
          
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            >
              <Store className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
          
          {!isVendor && !isAdmin && (
            <Link
              to="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
            >
              My Profile
            </Link>
          )}
          
          <Link
            to="/orders"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
          >
            My Orders
          </Link>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}


