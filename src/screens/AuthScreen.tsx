import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Tide } from '../components/Tide';
import { ValidationPill } from '../components/ValidationPill';
import { ThemeToggle } from '../components/ThemeToggle';
import { UISwitchButton } from '../components/UISwitchButton';
import { ThemeDecor } from '../components/decor/ThemeDecor';
import { useUITheme } from '../context/UIThemeContext';
import { getFramerTransition } from '../theme/uiThemes';
import { validateUsername } from '../lib/utils';

interface AuthScreenProps {
  initialMode?: 'signup' | 'login';
  onBackToWelcome?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signup',
}) => {
  const { themeDef } = useUITheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showHackerPrank, setShowHackerPrank] = useState(false);

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
        const res = await register(username, password, displayName);
        if (!res.success) {
          setServerError(res.error ?? 'Registration failed.');
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          const cleanU = username.trim().toLowerCase();
          // Hacker prank easter egg if someone tries to hack admin account
          if (cleanU === 'being_frzi' || cleanU === 'ankit') {
            setShowHackerPrank(true);
          } else {
            setServerError(res.error ?? 'Invalid username or password.');
          }
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

  const handlePrankSwitchToSignup = () => {
    setShowHackerPrank(false);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
    setMode('signup');
    setServerError(null);
  };

  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Visual Decor per UI look */}
      <ThemeDecor screen="auth" />

      {/* Top right Theme Switcher & Look Switcher */}
      <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
        <UISwitchButton />
        <ThemeToggle />
      </div>

      {/* Top Tide Header with Title */}
      <Tide screen="auth">
        <div className="absolute left-6 top-10 flex items-center">
          <motion.h2
            key={`${mode}-${themeDef.id}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getFramerTransition(themeDef.motionPreset, 0.1)}
            className="font-display text-[34px] leading-none text-[var(--top-ink)] tracking-wide"
          >
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </motion.h2>
        </div>
      </Tide>

      {/* Main Form Area */}
      <div className="relative z-10 flex-1 px-6 pt-[156px] pb-5 flex flex-col justify-between overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Display Name Field (Optional for signup) */}
          {mode === 'signup' && (
            <div className="flex flex-col">
              <label htmlFor="dn-input" className="text-[12px] font-semibold text-ink mb-1">
                Display Name <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                id="dn-input"
                type="text"
                autoComplete="name"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 rounded-xl bg-field shadow-neu-inset px-3.5 text-[14px] text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60"
                placeholder="e.g. Alex Rivera"
              />
            </div>
          )}

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
                  className="w-full h-11 rounded-xl bg-field shadow-neu-inset px-3.5 text-[14px] text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60"
                  placeholder="e.g. alex_rivera"
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
                  className="w-full h-11 rounded-xl bg-field shadow-neu-inset pl-3.5 pr-14 text-[14px] text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-11 px-3 text-[11px] font-bold text-muted hover:text-ink transition-colors select-none cursor-pointer"
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
                      className="w-full h-11 rounded-xl bg-field shadow-neu-inset px-3.5 text-[14px] text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60"
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
              className="p-3 rounded-xl bg-field shadow-neu-inset border border-bad/40 text-bad text-xs font-semibold leading-relaxed"
            >
              {serverError}
            </motion.div>
          )}
        </form>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2.5 pt-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleMode}
            className="text-[12px] font-semibold text-ink px-4 py-2 rounded-xl bg-field/70 shadow-neu-pill hover:bg-field min-h-[44px] flex items-center justify-center transition-all cursor-pointer"
          >
            {mode === 'signup' ? 'Have an account? Log in' : 'New here? Create account'}
          </motion.button>

          <motion.button
            type="button"
            whileHover={isFormValid && !submitting ? { scale: 1.02, y: -1 } : {}}
            whileTap={isFormValid && !submitting ? { scale: 0.96 } : {}}
            disabled={!isFormValid || submitting}
            onClick={handleSubmit}
            className={`w-full h-[46px] rounded-xl font-display text-[16px] tracking-wide flex items-center justify-center gap-2 transition-all select-none cursor-pointer ${
              isFormValid
                ? 'bg-btn text-btn-ink shadow-neu-float hover:opacity-90'
                : 'bg-dis/40 text-white/40 cursor-not-allowed shadow-none'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking…</span>
              </>
            ) : (
              <span>{mode === 'signup' ? 'Create Account' : 'Log in'}</span>
            )}
          </motion.button>

          <footer className="w-full text-center pt-1.5 pb-0.5 text-[10px] text-muted/75">
            © 2026 FRZI TOOLS. All rights reserved.
          </footer>
        </div>
      </div>

      {/* Full-Screen Hacker Prank Pop-up Modal */}
      <AnimatePresence>
        {showHackerPrank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="w-full max-w-sm bg-surface border-2 border-bad/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-bad/15 flex items-center justify-center text-3xl shadow-neu-raised border border-bad/30">
                ☠️
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-widest text-bad uppercase font-mono">
                  [ ACCESS DENIED: HACK DETECTED ]
                </span>
                <h3 className="font-display text-[26px] sm:text-[28px] leading-tight text-ink mt-1 font-bold">
                  haan bn liya hacker ab apna account bna le chu$iye
                </h3>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={handlePrankSwitchToSignup}
                className="w-full h-12 rounded-2xl bg-btn text-btn-ink font-display text-[16px] tracking-wide flex items-center justify-center gap-2 shadow-neu-float hover:opacity-90 transition-all cursor-pointer mt-2"
              >
                <span>Chalo, Apna Account Bnao</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
