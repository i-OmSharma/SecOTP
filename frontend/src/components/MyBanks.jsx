import React from "react";
import { Home as HomeIcon, Banknote, History, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function MyBanks() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">My Bank Accounts</h1>
        <p className="text-gray-500 mb-6">
          Effortlessly Manage Your Banking Activities
        </p>

        <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md w-80">
          <div className="text-lg font-semibold">Account_1</div>
          <div className="text-2xl font-bold mt-2">$320.00</div>
          <div className="mt-4 text-sm tracking-widest">•••• •••• •••• 0000</div>
          <div className="mt-2 text-xs opacity-75">CARD ID: OWIWF…fbWM*</div>
        </div>
      </main>
    </div>
  );
}


