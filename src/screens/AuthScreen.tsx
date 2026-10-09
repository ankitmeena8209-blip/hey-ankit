import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const result = isRegister
        ? await register(username, password)
        : await login(username, password);

      if (!result.success) {
        setErrorMessage(result.error ?? 'Authentication failed.');
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-page flex flex-col justify-between items-center p-4 sm:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-sm mx-auto my-auto py-8">
        {/* Brand Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-surface text-ink rounded-3xl p-7 sm:p-8 shadow-2xl border border-line flex flex-col gap-6"
        >
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-g1 to-g2 bg-clip-text text-transparent">
              Hey Ankit
            </h1>
            <p className="text-sm text-muted font-medium">Private chat. Just us.</p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-muted/60 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().trim());
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. leslie"
                  required
                  className="w-full bg-slate-50 dark:bg-teal-950/40 text-ink rounded-xl pl-10 pr-3.5 py-3 text-sm border border-line outline-none focus:ring-2 focus:ring-g2 focus:border-transparent transition-all placeholder:text-muted/50"
                />
              </div>
              {isRegister && (
                <span className="text-[11px] text-muted block pl-1">
                  3–20 lowercase letters, numbers, or underscores
                </span>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-muted/60 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-50 dark:bg-teal-950/40 text-ink rounded-xl pl-10 pr-11 py-3 text-sm border border-line outline-none focus:ring-2 focus:ring-g2 focus:border-transparent transition-all placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="touch-target absolute right-1 p-2 text-muted hover:text-ink flex items-center justify-center transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {isRegister && (
                <span className="text-[11px] text-muted block pl-1">
                  Minimum 8 characters
                </span>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={submitting}
              className="mt-2 w-full touch-target py-3 px-4 rounded-xl bg-gradient-to-r from-g1 to-g2 hover:opacity-95 active:opacity-90 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRegister ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{isRegister ? 'Create Account' : 'Log In'}</span>
              )}
            </motion.button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="pt-2 text-center text-xs">
            <button
              type="button"
              onClick={() => {
                setIsRegister((prev) => !prev);
                setErrorMessage(null);
              }}
              className="text-g1 hover:text-g2 dark:text-cyan-400 font-semibold underline underline-offset-4 transition-colors"
            >
              {isRegister
                ? 'Already have an account? Log in'
                : 'New here? Create account'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs font-medium text-white/80 select-none">
        © Being Frzi
      </footer>
    </div>
  );
};
