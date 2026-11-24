import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("reachinbox_token", token);
    }

    refreshUser().then(() => {
      navigate("/dashboard/scheduled", { replace: true });
    }).catch(() => {
      navigate("/login?error=auth_failed", { replace: true });
    });
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-600 font-medium">Completing authentication...</p>
      </div>
    </div>
  );
};
