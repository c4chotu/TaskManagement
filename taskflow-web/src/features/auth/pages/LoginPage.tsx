import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import apiClient from '../../../shared/lib/apiClient';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // const response = await apiClient.post('/api/v1/auth/login', { email, password });
      // const { accessToken, refreshToken, userId, orgId, email: userEmail, name } = response.data;

      // dispatch(setCredentials({
      //   accessToken,
      //   refreshToken,
      //   user: { userId, orgId, email: userEmail, name }
      // }));

      navigate('/home');
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Invalid email or password';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid md:grid-cols-12 rounded-2xl overflow-hidden glassmorphism shadow-2xl relative z-10 min-h-[600px]">
        {/* Artistic Promo Side */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-slate-900/80 to-[#121c2c] p-12 flex-col justify-between border-r border-white/5 relative">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <span className="font-mono font-bold text-white text-lg">TF</span>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TaskFlow Pro</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-white mt-12">
              Accelerate your workflow with AI-driven operations.
            </h1>
            <p className="text-slate-400 mt-4 text-sm leading-relaxed">
              TaskFlow Pro integrates project tracking, time management, automation rules, and smart context analysis in a unified collaborative space.
            </p>
          </div>

          <div className="mt-12">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">All systems operational (v1.0.0)</span>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="col-span-12 md:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-black/20">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Access your tasks, projects, and organization dashboards</p>

            {error && (
              <div className="mt-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Forgot Password?</a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white rounded-xl py-3 font-semibold shadow-lg shadow-sky-500/10 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/auth/register" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
