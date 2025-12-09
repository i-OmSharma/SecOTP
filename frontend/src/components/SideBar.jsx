import React from "react";
import { Home as HomeIcon, Banknote, History, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function SideBar() {
  return (
    // fixed + inset-y-0 pins it to top & bottom; z-20 keeps it above content
    <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-20 overflow-y-auto">
      <div className="px-6 py-6 font-bold text-lg text-blue-600">UserAccount</div>
      <nav className="flex flex-col gap-2 px-4 pb-6">
        <SidebarItem icon={<HomeIcon size={18} />} label="Home" to="/home" />
        <SidebarItem icon={<Banknote size={18} />} label="My Bank" to="/mybanks" />
        <SidebarItem icon={<History size={18} />} label="Transactions" to="/transactions" />
        <SidebarItem icon={<Send size={18} />} label="Transfer Funds" to="/transfer" />
      </nav>
    </aside>
  );
}

function SidebarItem({ icon, label, to }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        isActive ? "bg-blue-100 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}


