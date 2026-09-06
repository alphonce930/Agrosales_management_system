import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';

export default function GoogleSignInButton({ onCredential, disabled = false, context = 'signin' }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !buttonRef.current) return undefined;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current(response.credential),
        cancel_on_tap_outside: true,
        context
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: buttonRef.current.offsetWidth || 360,
        text: 'continue_with',
        shape: 'rectangular'
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      if (window.google?.accounts?.id) renderButton();
      else existingScript.addEventListener('load', renderButton, { once: true });
      return () => existingScript.removeEventListener('load', renderButton);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);

    return () => script.removeEventListener('load', renderButton);
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        title="Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable Google sign-in"
        className="flex min-h-10 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 opacity-60"
      >
        <span className="text-lg font-bold text-brand-deep">G</span>
        Continue with Google
      </button>
    );
  }

  return (
    <div className={`relative ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div ref={buttonRef} className="flex min-h-10 justify-center" />
      {disabled && <div className="absolute inset-0" aria-hidden="true" />}
    </div>
  );
}
