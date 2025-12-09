import React from "react";
import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-gray-500 mb-4">
          Access & manage your account and transactions efficiently.
        </p>

        {/* Balance */}
        <div className="bg-white shadow rounded-xl p-6 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-500">Bank Account</p>
            <h2 className="text-2xl font-bold">$320.00</h2>
          </div>
          <div className="w-20 h-20 border-4 border-blue-500 rounded-full flex items-center justify-center font-semibold text-lg">
            💰
          </div>
        </div>

        {/* Navigate button */}
        <button
          onClick={() => navigate("/transfer")}
          className="mb-4 px-4 py-2 cursor-pointer hover:bg-blue-500 rounded-lg bg-blue-600 text-white"
        >
          Make Payment
        </button>

        {/* Recent Transactions section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Recent Transactions</h2>
          <div className="bg-white shadow rounded-xl p-4 overflow-x-auto">
            <table className="min-w-full rounded-lg">
              <thead className="border-b text-gray-600">
                <tr>
                  <th className="px-4 py-2 border-b">Transaction</th>
                  <th className="px-4 py-2 border-b">Amount</th>
                  <th className="px-4 py-2 border-b">Status</th>
                  <th className="px-4 py-2 border-b">Date</th>
                  <th className="px-4 py-2 border-b">Channel</th>
                  <th className="px-4 py-2 border-b">Category</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="6" className="text-center text-gray-400 py-4">
                    No transactions yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
