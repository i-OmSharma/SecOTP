import React from "react";
import { Link } from "react-router-dom"; 
import { HomeIcon, Banknote, History, Send } from "lucide-react";

export  function TransferFunds() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      

      {/* Main Content */}
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-bold mb-2">Payment Transfer</h2>
        <p className="text-gray-500 mb-6">
          Please provide any specific details or notes related to the payment
          transfer
        </p>

        <form className="bg-white rounded-lg shadow p-6 max-w-2xl">
          {/* Transfer details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Transfer details</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Source Bank
            </label>
       <select
  defaultValue=""
  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
>
  {/* Blank placeholder */}
  <option value="" disabled>
    -- Select Source Bank --
  </option>

  {/* Actual options */}
  <option value="savings">Savings Account</option>
  <option value="credit">Credit Card</option>
</select>






            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Note (Optional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write a short note here"
            />
          </div>

          {/* Bank account details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Bank account details</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient's Account Number
            </label>
            <input
              type="number"
              placeholder="Enter the public account number "
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receiver's Account Number
            </label>
            <input
              type="text"
              placeholder="Enter the public account number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              placeholder="ex: 5.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Transfer Funds
          </button>
        </form>
      </main>
    </div>
  );
}

