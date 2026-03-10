"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration request sent! Please wait for admin approval.");
        router.push("/login");
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (error) {
      alert("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE6] flex items-center justify-center p-6 text-black font-sans">
      {/* Outer Layer (The soft yellow border/shadow effect from image) */}
      <div className="bg-[#F3EBC7] p-2 rounded-[50px] w-full max-w-[480px] shadow-sm">
        
        {/* Main Card */}
        <div className="bg-white px-10 py-14 rounded-[45px] w-full border-t border-white">
          
          {/* Header Section (Logo & Title) */}
          <div className="flex flex-col items-center mb-10">
            <div className="mb-2">
               <div className="text-[#2D3142] text-xs font-black text-center">
                 {/* Replace with actual logo image path */}
                 <img src="/logo-placeholder.png" alt="StockMate Logo" className="h-12 mx-auto mb-1" />
                 STOCKMATE
               </div>
            </div>
            <h2 className="text-[10px] tracking-[0.25em] font-black text-[#A5ADC1] uppercase">
              Canteen Inventory System
            </h2>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="block font-black text-[11px] text-[#A5ADC1] uppercase tracking-widest ml-1">First Name</label>
              <input
                type="text"
                className="w-full h-[58px] px-6 rounded-[22px] border-2 border-black bg-[#EBF2FF] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6BCB3B] transition-all"
                placeholder="Enter your first name"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block font-black text-[11px] text-[#A5ADC1] uppercase tracking-widest ml-1">Last Name</label>
              <input
                type="text"
                className="w-full h-[58px] px-6 rounded-[22px] border-2 border-black bg-[#EBF2FF] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6BCB3B] transition-all"
                placeholder="Enter your last name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="block font-black text-[11px] text-[#A5ADC1] uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                className="w-full h-[58px] px-6 rounded-[22px] border-2 border-black bg-[#EBF2FF] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6BCB3B] transition-all"
                placeholder="Enter your email address"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <label className="block font-black text-[11px] text-[#A5ADC1] uppercase tracking-widest ml-1">Contact Number</label>
              <input
                type="text"
                className="w-full h-[58px] px-6 rounded-[22px] border-2 border-black bg-[#EBF2FF] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6BCB3B] transition-all"
                placeholder="Enter your contact number"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
              />
            </div>

            {/* Main Action Button (Green Style) */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[62px] bg-[#73CD3C] text-white rounded-[22px] font-black text-sm uppercase tracking-[0.2em] shadow-[0_5px_0_0_#5DA830] active:shadow-none active:translate-y-1 transition-all"
              >
                {isLoading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>

          {/* Secondary Action Button (White/Black Style) */}
          <div className="mt-4">
            <Link href="/login">
              <button className="w-full h-[62px] border-2 border-black bg-white text-black rounded-[22px] font-black text-sm uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:translate-y-0.5">
                Back to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}