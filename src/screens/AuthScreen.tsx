import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tide } from '../components/Tide';
import { ValidationPill } from '../components/ValidationPill';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlassBackground } from '../components/GlassBackground';
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
  const isPasswordValid = password.length >= 6;
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
    <div className="relative h-dvh w-full max-w-md mx-auto flex flex-col justify-between overflow-hidden select-none" data-s="auth">
      {/* Dynamic Glass Ambient Orbs & Veil */}
      <GlassBackground screen="auth" />

      {/* Top right Theme Switcher */}
      <div className="absolute top-3.5 right-3.5 z-40">
        <ThemeToggle />
      </div>

      {/* Top Tide Header with Title */}
      <Tide screen="auth">
        <div className="absolute left-6 top-12 z-20">
          <motion.h2
            key={mode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display font-bold text-[28px] leading-none text-white tracking-tight"
          >
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </motion.h2>
        </div>
      </Tide>

      {/* Main Form Area */}
      <div className="relative z-10 flex-1 px-6 pt-[164px] pb-6 flex flex-col justify-between overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Username Field */}
          <div className="flex flex-col">
            <label htmlFor="u-input" className="text-[12px] font-semibold text-ink mb-1">
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
                  className="w-full h-10 rounded-[12px] bg-field/60 border border-gb text-ink px-3 text-[14px] outline-none transition-all placeholder:text-muted/60 focus:border-acc focus:shadow-[0_0_0_3px_var(--accg)]"
                  placeholder="e.g. being_frzi"
                />
              </div>
              <ValidationPill isValid={isUsernameValid} label="Username" />
            </div>
            <small
              className={`text-[11px] mt-1 transition-colors font-medium min-h-[14px] ${
                username && !isUsernameValid ? 'text-bad' : 'text-muted'
              }`}
            >
              3–20 letters, numbers or _
            </small>
          </div>

          {/* Password Field */}
          <div className="flex flex-col">
            <label htmlFor="pw-input" className="text-[12px] font-semibold text-ink mb-1">
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
                  className="w-full h-10 rounded-[12px] bg-field/60 border border-gb text-ink pl-3 pr-14 text-[14px] outline-none transition-all placeholder:text-muted/60 focus:border-acc focus:shadow-[0_0_0_3px_var(--accg)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-10 px-3 text-[11px] font-bold text-muted hover:text-ink transition-colors select-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <ValidationPill isValid={isPasswordValid} label="Password" />
            </div>
            <small
              className={`text-[11px] mt-1 transition-colors font-medium min-h-[14px] ${
                password && !isPasswordValid ? 'text-bad' : 'text-muted'
              }`}
            >
              At least 6 characters
            </small>
          </div>

          {/* Confirm Password Field (Collapses smoothly in login mode) */}
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden flex flex-col"
              >
                <label htmlFor="cp-input" className="text-[12px] font-semibold text-ink mb-1">
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
                      className="w-full h-10 rounded-[12px] bg-field/60 border border-gb text-ink px-3 text-[14px] outline-none transition-all placeholder:text-muted/60 focus:border-acc focus:shadow-[0_0_0_3px_var(--accg)]"
                      placeholder="••••••••"
                    />
                  </div>
                  <ValidationPill isValid={isConfirmValid && confirmPassword.length > 0} label="Confirm password" />
                </div>
                <small
                  className={`text-[11px] mt-1 transition-colors font-medium min-h-[14px] ${
                    confirmPassword && confirmPassword !== password ? 'text-bad' : 'text-muted'
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
              className="p-3 rounded-[12px] bg-field/80 border border-bad/40 text-bad text-xs font-semibold leading-relaxed"
            >
              {serverError}
            </motion.div>
          )}
        </form>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2.5 pt-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-[12px] font-semibold text-ink underline underline-offset-4 min-h-[44px] flex items-center justify-center transition-all cursor-pointer"
          >
            {mode === 'signup' ? 'Have an account? Log in' : 'New here? Create account'}
          </button>

          <motion.button
            type="button"
            whileHover={isFormValid && !submitting ? { scale: 1.02, y: -1 } : {}}
            whileTap={isFormValid && !submitting ? { scale: 0.96 } : {}}
            disabled={!isFormValid || submitting}
            onClick={handleSubmit}
            className={`w-full h-[44px] rounded-[13px] font-display font-semibold text-[14px] flex items-center justify-center gap-2 transition-all select-none cursor-pointer ${
              isFormValid
                ? 'btn-sent sheen text-white shadow-lg'
                : 'bg-glass text-muted border border-gb cursor-not-allowed opacity-60'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
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

