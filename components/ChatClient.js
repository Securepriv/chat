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

const SESSION_STORAGE_KEY = 'private-chat-session';

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="22"
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 7V5.8C10 4.81 10 4.31 10.19 3.93C10.36 3.6 10.63 3.33 10.96 3.16C11.34 2.97 11.84 2.97 12.83 2.97H17.2C18.88 2.97 19.72 2.97 20.36 3.3C20.92 3.58 21.38 4.04 21.67 4.61C22 5.25 22 6.09 22 7.77V16.2C22 17.88 22 18.72 21.67 19.36C21.38 19.92 20.92 20.38 20.36 20.67C19.72 21 18.88 21 17.2 21H12.8C11.81 21 11.31 21 10.93 20.81C10.6 20.64 10.33 20.37 10.16 20.04C9.97 19.66 9.97 19.16 9.97 18.17V17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M15 12H2M2 12L6 8M2 12L6 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function getInitials(name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return '?';
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export default function ChatClient() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [authData, setAuthData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [privateUsers, setPrivateUsers] = useState([]);
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('chat-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedTheme ? savedTheme === 'dark' : prefersDark);

    const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session?.apiKey && session?.token && session?.user && session?.channelId) {
          setAuthData({ type: 'session', session });
        }
      } catch (error) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
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

    setAuthData({ type: 'password', name: cleanedName, password });
  }

  useEffect(() => {
    if (!authData) return;

    let cancelled = false;
    let chatClient;

    async function connect() {
      try {
        setLoading(true);
        setError('');
        setClient(null);
        setChannel(null);
        setCurrentUser(null);

        let session;

        if (authData.type === 'session') {
          session = authData.session;
        } else {
          const response = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: authData.name, password: authData.password }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Impossible de récupérer le token GetStream.');
          }

          session = {
            apiKey: data.apiKey,
            token: data.token,
            channelId: data.channelId,
            channelType: data.channelType || 'messaging',
            privateUsers: data.privateUsers || [],
            user: data.user,
          };

          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        }

        chatClient = new StreamChat(session.apiKey);
        await chatClient.connectUser(session.user, session.token);

        const chatChannel = chatClient.channel(session.channelType || 'messaging', session.channelId);
        await chatChannel.watch();

        if (!cancelled) {
          setCurrentUser(session.user);
          setPrivateUsers(session.privateUsers || []);
          setClient(chatClient);
          setChannel(chatChannel);
          setName(session.user?.id || '');
        }
      } catch (err) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        if (!cancelled) {
          setAuthData(null);
          setPassword('');
          setError(err.message || 'Erreur de connexion. Reconnectez-vous.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (chatClient) chatClient.disconnectUser();
    };
  }, [authData]);

  function leaveChat() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    if (client) client.disconnectUser();
    setClient(null);
    setChannel(null);
    setCurrentUser(null);
    setPrivateUsers([]);
    setAuthData(null);
    setPassword('');
  }

  const currentUserName = currentUser?.name || currentUser?.id || 'Utilisateur';
  const otherUsers = privateUsers.filter((user) => user.id !== currentUser?.id);
  const participantsText = privateUsers.length
    ? privateUsers.map((user) => user.name || user.id).join(' · ')
    : 'Conversation privée';

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
    <main className={`chat-page messenger-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <aside className="chat-sidebar">
        <div className="sidebar-title">Messagerie</div>

        <div className="profile-card">
          <div className="avatar large-avatar">{getInitials(currentUserName)}</div>
          <div>
            <strong>{currentUserName}</strong>
            <span>En ligne</span>
          </div>
        </div>

        <div className="conversation-list">
          <p className="section-label">Conversation</p>
          <button className="conversation-item active" type="button">
            <div className="avatar conversation-avatar">💬</div>
            <div>
              <strong>Conversation privée</strong>
              <span>{participantsText}</span>
            </div>
          </button>
        </div>

        {otherUsers.length > 0 && (
          <div className="conversation-list participants-list">
            <p className="section-label">Participant</p>
            {otherUsers.map((user) => (
              <div className="participant-item" key={user.id}>
                <div className="avatar small-avatar">{getInitials(user.name || user.id)}</div>
                <div>
                  <strong>{user.name || user.id}</strong>
                  <span>Conversation privée</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <section className="conversation-panel">
        <div className="topbar conversation-topbar">
          <div>
            <strong>Conversation privée</strong>
            <span>{participantsText}</span>
          </div>

          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleDarkMode} type="button">
              {darkMode ? '☀️ Clair' : '🌙 Sombre'}
            </button>
            <button
              aria-label="Déconnexion"
              className="logout-icon-button"
              onClick={leaveChat}
              title="Déconnexion"
              type="button"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>

        <div className="chat-shell messenger-chat-shell">
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
      </section>
    </main>
  );
}
