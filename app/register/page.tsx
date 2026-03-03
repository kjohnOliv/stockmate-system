"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    contact_number: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Hits the Go backend handleRegister endpoint
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration request sent! Please wait for admin approval."); //
        router.push("/login");
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (error) {
      alert("Backend connection failed. Is your Go server running on port 8080?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center p-4 text-black">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md text-center border-4 border-[#F3EBC7]">
        <h1 className="text-2xl font-bold text-[#2D3142] mb-2">Create Account</h1>
        <p className="text-gray-500 mb-6">Join StockMate Inventory</p>

        <form onSubmit={handleRegister} className="text-left space-y-4">
          <div>
            <label className="block font-bold mb-1 text-sm">Full Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2 border-black outline-none"
              placeholder="e.g. John Doe"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block font-bold mb-1 text-sm">Email Address</label>
            <input
              type="email"
              className="w-full p-3 rounded-xl border-2 border-black outline-none"
              placeholder="name@email.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block font-bold mb-1 text-sm">Contact Number</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2 border-black outline-none"
              placeholder="09123456789"
              required
              value={formData.contact_number}
              onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
            />
          </div>

          <div>
            <label className="block font-bold mb-1 text-sm">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl border-2 border-black outline-none"
              placeholder="Min. 8 characters"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white py-3 rounded-xl font-bold text-lg mt-4 transition-all ${
              isLoading ? "bg-gray-400" : "bg-[#6BCB3B] hover:bg-[#5bb331]"
            }`}
          >
            {isLoading ? "Submitting..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#6BCB3B] font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}