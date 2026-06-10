'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [hardDelete, setHardDelete] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function clearMessages(event) {
    event.preventDefault();
    setResult('');
    setError('');

    if (!password) {
      setError('Entrez le mot de passe administrateur.');
      return;
    }

    const confirmed = window.confirm(
      hardDelete
        ? 'Attention: cette action supprimera définitivement tous les messages. Continuer ?'
        : 'Cette action masquera tous les messages dans le tchat. Continuer ?',
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch('/api/admin/clear-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, hardDelete }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer les messages.');
      }

      setResult(data.message || 'Messages supprimés.');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card login-card">
        <div className="logo">🧹</div>

        <h1>Admin</h1>

        <p className="subtitle">
          Supprimer tous les messages de la conversation privée GetStream.
        </p>

        <form onSubmit={clearMessages} className="login-form">
          <label htmlFor="admin-password">Mot de passe administrateur</label>

          <input
            id="admin-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe admin"
            type="password"
            autoComplete="current-password"
            disabled={loading}
          />

          <label className="checkbox-line">
            <input
              checked={hardDelete}
              onChange={(event) => setHardDelete(event.target.checked)}
              type="checkbox"
              disabled={loading}
            />
            Suppression définitive des messages
          </label>

          <button disabled={loading} type="submit">
            {loading ? 'Suppression...' : 'Supprimer tous les messages'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {result && <p className="success">{result}</p>}

        <p className="hint">
          Si vous décochez la suppression définitive, les messages seront seulement masqués dans le tchat.
        </p>
      </section>
    </main>
  );
}
