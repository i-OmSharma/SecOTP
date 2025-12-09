import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export const SignIn = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = (e) => {
    e.preventDefault();

    // Basic validation
    if (!username || !password) {
      alert("Both username and password are required!");
      return;
    }

    // For now, any valid input redirects to /home
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section (Form) */}
      <div className="w-1/2 flex flex-col justify-center px-20 bg-white">
        <h1 className="text-3xl font-bold text-blue-700 mb-6">MyBank</h1>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Sign In</h2>
        <p className="text-gray-500 mb-8">Enter your details</p>

        <form onSubmit={handleSignIn}>
          <label className="block text-gray-700 font-medium mb-1">Username</label>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-gray-700 font-medium mb-1">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 mb-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Enter
          </button>
        </form>

        <p className="text-gray-600 text-sm mt-6">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </div>

      {/* Right Section (Gradient Background) */}
      <div className="w-1/2 bg-gradient-to-br from-blue-300 via-blue-200 to-blue-300"></div>
    </div>
  );
};
