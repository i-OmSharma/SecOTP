import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const OTPVerification = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || "your number";

  const handleVerify = (e) => {
    e.preventDefault();
    // API call to verify OTP
    console.log("Verifying OTP:", otp);
    alert("OTP Verified Successfully!");
    navigate("/"); // or wherever after successful signup
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Verify OTP</h2>
        <p className="text-gray-500 mb-6">Enter the OTP sent to {phone}</p>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
};
