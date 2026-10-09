import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tide } from '../components/Tide';
import { ValidationPill } from '../components/ValidationPill';
import { validateUsername } from '../lib/utils';

interface AuthScreenProps {
  initialMode?: 'signup' | 'login';
  onBackToWelcome?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signup',
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sync mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Validation checks
  const usernameCheck = validateUsername(username);
  const isUsernameValid = usernameCheck.valid;
  const isPasswordValid = password.length >= 8;
  const isConfirmValid = mode === 'login' || (isPasswordValid && confirmPassword === password && confirmPassword.length > 0);

  const isFormValid = isUsernameValid && isPasswordValid && isConfirmValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setServerError(null);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const res = await register(username, password);
        if (!res.success) {
          setServerError(res.error ?? 'Registration failed.');
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setServerError(res.error ?? 'Invalid username or password.');
        }
      }
    } catch {
      setServerError('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signup' ? 'login' : 'signup'));
    setServerError(null);
  };

  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Top Tide Header with Title */}
      <Tide screen="auth">
        <div className="absolute left-6 top-14">
          <motion.h2
            key={mode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[46px] leading-none text-white tracking-wide"
          >
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </motion.h2>
        </div>
      </Tide>

      {/* Main Form Area */}
      <div className="relative z-10 flex-1 px-6 pt-[180px] pb-6 flex flex-col justify-between overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Username Field */}
          <div className="flex flex-col">
            <label htmlFor="u-input" className="text-[13px] font-semibold text-ink mb-1.5">
              Username
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="u-input"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  maxLength={20}
                  value={username}
                  onChange={(e) => {
                    let val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsername(val);
                    setServerError(null);
                  }}
                  className="w-full h-11 rounded-xl bg-field shadow-neu px-3.5 text-[15px] text-ink outline-none border-2 border-transparent focus:border-ink focus:-translate-y-0.5 transition-all"
                  placeholder="e.g. being_frzi"
                />
              </div>
              <ValidationPill isValid={isUsernameValid} label="Username" />
            </div>
            <small
              className={`text-[11px] mt-1.5 transition-colors ${
                username && !isUsernameValid ? 'text-bad font-medium' : 'text-muted'
              }`}
            >
              3–20 letters, numbers or _
            </small>
          </div>

          {/* Password Field */}
          <div className="flex flex-col">
            <label htmlFor="pw-input" className="text-[13px] font-semibold text-ink mb-1.5">
              Password
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="pw-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setServerError(null);
                  }}
                  className="w-full h-11 rounded-xl bg-field shadow-neu pl-3.5 pr-14 text-[15px] text-ink outline-none border-2 border-transparent focus:border-ink focus:-translate-y-0.5 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-11 px-3 text-xs font-bold text-muted hover:text-ink transition-colors select-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <ValidationPill isValid={isPasswordValid} label="Password" />
            </div>
            <small
              className={`text-[11px] mt-1.5 transition-colors ${
                password && !isPasswordValid ? 'text-bad font-medium' : 'text-muted'
              }`}
            >
              At least 8 characters
            </small>
          </div>

          {/* Confirm Password Field (Collapses smoothly in login mode) */}
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.7, 0, 0.2, 1] }}
                className="overflow-hidden flex flex-col"
              >
                <label htmlFor="cp-input" className="text-[13px] font-semibold text-ink mb-1.5">
                  Confirm password
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="cp-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setServerError(null);
                      }}
                      className="w-full h-11 rounded-xl bg-field shadow-neu px-3.5 text-[15px] text-ink outline-none border-2 border-transparent focus:border-ink focus:-translate-y-0.5 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <ValidationPill isValid={isConfirmValid && confirmPassword.length > 0} label="Confirm password" />
                </div>
                <small
                  className={`text-[11px] mt-1.5 transition-colors ${
                    confirmPassword && confirmPassword !== password ? 'text-bad font-medium' : 'text-muted'
                  }`}
                >
                  Must match password
                </small>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Server Error Alert */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-field border border-bad/40 text-bad text-xs font-medium leading-relaxed"
            >
              {serverError}
            </motion.div>
          )}
        </form>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-[13px] font-semibold text-ink underline underline-offset-4 min-h-[44px] flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            {mode === 'signup' ? 'Have an account? Log in' : 'New here? Create account'}
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            disabled={!isFormValid || submitting}
            onClick={handleSubmit}
            className={`w-full h-12 rounded-xl font-display text-[20px] tracking-wider flex items-center justify-center gap-2.5 transition-all select-none shadow-sm ${
              isFormValid
                ? 'bg-btn text-btn-ink cursor-pointer'
                : 'bg-dis text-white/50 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Checking…</span>
              </>
            ) : (
              <span>{mode === 'signup' ? 'Confirm' : 'Log in'}</span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
