import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";

function Login({ setAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // State for error message
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Authenticate user via strapi api
    // If authenticated, setAuth(true) and navigate to /admin
    // Else, alert invalid credentials
    const url = `${process.env.REACT_APP_API_URL}auth/local`;
    try {
        const response = await axios.post(
          url,
          {
            identifier: username, // Use identifier to handle both username and email
            password: password,
          }
        );
        const jwt = response.data.jwt;
        Cookies.set("jwt", jwt, { expires: 7 }); // Store the JWT in a cookie
        navigate("/Admin"); // Redirect after login
        setAuth(true); // Set the auth state to true
      } catch (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setErrorMessage("Invalid username or password. Please try again.");
          console.error("Error response data:", error.response.data);
          console.error("Error response status:", error.response.status);
          console.error("Error response headers:", error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          setErrorMessage("No response from server. Please try again later.");
          console.error("Error request data:", error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          setErrorMessage("An error occurred. Please try again.");
          console.error("Error message:", error.message);
        }
        console.error("Error config:", error.config);
      }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl mb-4">Login</h2>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        <div className="mb-4">
          <label className="block mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
