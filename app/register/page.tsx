"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    password: "", // Added password field
  });
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          username: formData.email.split('@')[0], 
          email: formData.email,
          password: formData.password, // Send password to backend
          contact_number: formData.contactNumber,
          role: "staff", // Default role, admin can change this later
          status: "pending", // Explicitly set status for admin review
          is_active: false    // Accounts are disabled by default
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({ 
            type: "success", 
            message: "Registration request sent! Please wait for admin approval." 
        });
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setFeedback({ type: "error", message: data.message || "Registration failed" });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Connection error. Is your server running?" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDE7] flex items-center justify-center p-4 text-black font-sans">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md border-4 border-[#F3EBC7] animate-in fade-in zoom-in duration-300">
        <h1 className="text-2xl font-black text-[#2D3142] mb-6 text-center uppercase tracking-tighter">Sign Up</h1>

        {feedback.message && (
          <div className={`mb-6 p-4 rounded-[20px] border-2 flex items-center gap-3 animate-in slide-in-from-top-2 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <p className="text-[10px] font-black uppercase tracking-tight text-left leading-tight">
                {feedback.message}
            </p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">First Name</label>
                <input
                    type="text"
                    className="w-full p-3 rounded-xl border-2 border-black outline-none focus:border-[#6BCB3B] font-bold"
                    placeholder="John"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
            </div>
            <div>
                <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Last Name</label>
                <input
                    type="text"
                    className="w-full p-3 rounded-xl border-2 border-black outline-none focus:border-[#6BCB3B] font-bold"
                    placeholder="Doe"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                />
            </div>
          </div>

          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              className="w-full p-3 rounded-xl border-2 border-black outline-none focus:border-[#6BCB3B] font-bold"
              placeholder="email@example.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Contact Number</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2 border-black outline-none focus:border-[#6BCB3B] font-bold"
              placeholder="09XXXXXXXXX"
              required
              value={formData.contactNumber}
              onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
            />
          </div>

          <div>
            <label className="block font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl border-2 border-black outline-none focus:border-[#6BCB3B] font-bold"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || feedback.type === 'success'}
            className={`w-full text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest mt-6 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isLoading || feedback.type === 'success' ? "bg-gray-400 cursor-not-allowed" : "bg-[#6BCB3B] hover:bg-[#5bb331] shadow-[#6BCB3B]/30"
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
            {isLoading ? "Sending..." : "Send Request"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-black hover:underline">
            Already have an account? <span className="text-[#6BCB3B]">Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}