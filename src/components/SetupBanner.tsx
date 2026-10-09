import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const SetupBanner: React.FC = () => {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface text-ink rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">Hey Ankit</h1>
            <p className="text-xs text-muted">Supabase Setup Required</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-field border border-line text-ink text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-bad" />
          <div>
            <span className="font-semibold block mb-0.5">Configuration Needed</span>
            Connect your Supabase project by adding your credentials to{' '}
            <code className="font-mono bg-surface px-1 py-0.5 rounded border border-line">.env.local</code>.
          </div>
        </div>

        <div className="space-y-3 text-xs text-ink/90">
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-g2/20 text-g1 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              1
            </span>
            <p>
              Open your Supabase dashboard at <strong>supabase.com</strong>, navigate to{' '}
              <strong>Project Settings → API</strong>.
            </p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-g2/20 text-g1 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              2
            </span>
            <p>
              Copy <strong>Project URL</strong> and <strong>anon public key</strong> into your{' '}
              <code className="font-mono bg-black/10 px-1 py-0.5 rounded">.env.local</code> file.
            </p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-g2/20 text-g1 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              3
            </span>
            <p>
              Run the SQL file in <code className="font-mono bg-black/10 px-1 py-0.5 rounded">supabase/migrations/</code> in the Supabase SQL editor.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-muted text-center pt-2 border-t border-line">
          © Being Frzi · Hey Ankit
        </div>
      </div>
    </div>
  );
};
