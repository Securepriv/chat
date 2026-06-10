'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelHeader,
  LoadingIndicator,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react';

export default function ChatClient() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loginData, setLoginData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('chat-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedTheme ? savedTheme === 'dark' : prefersDark);
  }, []);

  function toggleDarkMode() {
    setDarkMode((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem('chat-theme', nextValue ? 'dark' : 'light');
      return nextValue;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    const cleanedName = String(name || '').trim().toLowerCase();
    if (!cleanedName) {
      setError("Entrez votre nom d'utilisateur.");
      return;
    }

    if (!password) {
      setError('Entrez votre mot de passe.');
      return;
    }

    setLoginData({ name: cleanedName, password });
  }

  useEffect(() => {
    if (!loginData) return;

    let cancelled = false;
    let chatClient;

    async function connect() {
      try {
        setLoading(true);
        setError('');
        setClient(null);
        setChannel(null);
        setCurrentUser(null);

        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Impossible de récupérer le token GetStream.');
        }

        chatClient = new StreamChat(data.apiKey);
        await chatClient.connectUser(data.user, data.token);

        const chatChannel = chatClient.channel(data.channelType || 'messaging', data.channelId);
        await chatChannel.watch();

        if (!cancelled) {
          setCurrentUser(data.user);
          setClient(chatClient);
          setChannel(chatChannel);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Erreur de connexion.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (chatClient) chatClient.disconnectUser();
    };
  }, [loginData]);

  function leaveChat() {
    if (client) client.disconnectUser();
    setClient(null);
    setChannel(null);
    setCurrentUser(null);
    setLoginData(null);
    setPassword('');
  }

  if (!client || !channel) {
    return (
      <main className={`page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <section className="card login-card">
          <button className="theme-toggle login-theme-toggle" onClick={toggleDarkMode} type="button">
            {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
          </button>

          <div className="logo">🔒</div>
          <h1>Connexion</h1>
          <p className="subtitle">
            Connectez-vous pour accéder à votre conversation privée.
          </p>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              maxLength={60}
              autoComplete="username"
              disabled={loading}
            />

            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Entrez votre mot de passe"
              type="password"
              autoComplete="current-password"
              disabled={loading}
            />

            <button disabled={loading} type="submit">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {loading && (
            <div className="loading-line">
              <LoadingIndicator /> Connexion à GetStream...
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className={`chat-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="topbar">
        <div>
          <strong>Conversation privée</strong>
          <span>Connecté comme {currentUser?.name || loginData?.name}</span>
        </div>

        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggleDarkMode} type="button">
            {darkMode ? '☀️ Clair' : '🌙 Sombre'}
          </button>
          <button onClick={leaveChat} type="button">Quitter</button>
        </div>
      </div>

      <div className="chat-shell">
        <Chat client={client} theme={darkMode ? 'str-chat__theme-dark' : 'str-chat__theme-light'}>
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageComposer focus />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </main>
  );
}
