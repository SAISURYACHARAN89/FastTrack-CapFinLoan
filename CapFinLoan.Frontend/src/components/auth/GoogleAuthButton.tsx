import { useEffect, useRef } from 'react';

type GoogleAuthButtonProps = {
  clientId: string;
  mode: 'signin' | 'signup';
  onCredential: (idToken: string) => void;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            theme: 'outline' | 'filled_blue' | 'filled_black';
            size: 'large' | 'medium' | 'small';
            text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape: 'rectangular' | 'pill' | 'circle' | 'square';
            width?: string;
          }
        ) => void;
      };
    };
  };
};

const GOOGLE_SCRIPT_ID = 'google-identity-services-script';

export function GoogleAuthButton({ clientId, mode, onCredential }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return;
    }

    const renderGoogleButton = () => {
      const win = window as GoogleWindow;
      if (!win.google || !containerRef.current) {
        return;
      }

      win.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          if (response.credential) {
            onCredential(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      containerRef.current.innerHTML = '';
      win.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'pill',
        width: '360'
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if ((window as GoogleWindow).google) {
        renderGoogleButton();
      } else {
        existingScript.addEventListener('load', renderGoogleButton, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [clientId, mode, onCredential]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-outline-variant/40 p-3 text-xs text-on-surface-variant text-center">
        Google sign-in is unavailable. Set VITE_GOOGLE_CLIENT_ID in frontend env.
      </div>
    );
  }

  return <div className="flex justify-center" ref={containerRef} />;
}
