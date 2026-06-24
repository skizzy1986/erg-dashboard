import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function installPrompt() {
    if (!prompt) return;
    const { outcome } = await prompt.prompt();
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }

  return { canInstall: !!prompt && !installed, installed, installPrompt };
}
