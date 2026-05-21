import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, LayoutGrid, Settings, FileText, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: List, label: 'Projeler' },
    { to: '/financials', icon: DollarSign, label: 'Finansal Veriler' },
    { to: '/fields', icon: Settings, label: 'Alan Yönetimi' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                <FileText size={16} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">Cost Reduction</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 font-semibold text-sm" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            
            {/* Mobile menu button could go here if needed, for now we will just show the items on mobile or keep it simple */}
          </div>
          
          {/* Mobile Navigation (simple wrap) */}
          <div className="md:hidden flex overflow-x-auto pb-3 space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 font-semibold text-sm" 
                    : "text-slate-500 hover:bg-slate-50 font-medium text-sm"
                )}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
