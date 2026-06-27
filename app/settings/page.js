'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [theme, setTheme] = useState('light');
  const [message, setMessage] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setTheme(window.localStorage.getItem('chat-theme') || 'light');
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  }, []);

  function changeTheme(nextTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem('chat-theme', nextTheme);
    setMessage('Thème enregistré. Retournez au tchat pour voir le changement.');
  }

  function clearSession() {
    window.localStorage.removeItem('private-chat-session');
    setMessage('Session supprimée. Vous devrez vous reconnecter.');
  }

  function clearOfflineCache() {
    window.localStorage.removeItem('private-chat-offline-messages');
    setMessage('Cache hors ligne supprimé.');
  }

  return (
    <main className="page settings-page">
      <section className="card settings-card">
        <div className="logo">⚙️</div>
        <h1>Paramètres</h1>
        <p className="subtitle">Gérez l’affichage, la session, l’installation Android et le cache hors ligne.</p>

        <div className="settings-section">
          <h2>Apparence</h2>
          <div className="settings-buttons">
            <button className={theme === 'light' ? 'selected-setting' : ''} onClick={() => changeTheme('light')} type="button">☀️ Mode clair</button>
            <button className={theme === 'dark' ? 'selected-setting' : ''} onClick={() => changeTheme('dark')} type="button">🌙 Mode sombre</button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Application Android</h2>
          <p>{isStandalone ? 'L’application semble déjà installée.' : 'Sur Android Chrome: ouvrez le menu ⋮ puis “Ajouter à l’écran d’accueil”.'}</p>
        </div>

        <div className="settings-section">
          <h2>Session et cache</h2>
          <div className="settings-buttons">
            <button onClick={clearSession} type="button">Supprimer la session</button>
            <button onClick={clearOfflineCache} type="button">Vider le cache hors ligne</button>
          </div>
        </div>

        {message && <p className="success">{message}</p>}

        <a className="settings-link back-link" href="/">← Retour au tchat</a>
      </section>
    </main>
  );
}
