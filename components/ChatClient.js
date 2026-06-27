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
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 7V5.8C10 4.81 10 4.31 10.19 3.93C10.36 3.6 10.63 3.33 10.96 3.16C11.34 2.97 11.84 2.97 12.83 2.97H17.2C18.88 2.97 19.72 2.97 20.36 3.3C20.92 3.58 21.38 4.04 21.67 4.61C22 5.25 22 6.09 22 7.77V16.2C22 17.88 22 18.72 21.67 19.36C21.38 19.92 20.92 20.38 20.36 20.67C19.72 21 18.88 21 17.2 21H12.8C11.81 21 11.31 21 10.93 20.81C10.6 20.64 10.33 20.37 10.16 20.04C9.97 19.66 9.97 19.16 9.97 18.17V17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M15 12H2M2 12L6 8M2 12L6 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M10 11V17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14 11V17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M5 7L6 20C6.08 21.1 6.92 22 8 22H16C17.08 22 17.92 21.1 18 20L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9 7V4C9 3.45 9.45 3 10 3H14C14.55 3 15 3.45 15 4V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
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

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatPresence(user) {
  if (user?.online) return 'En ligne';
  if (user?.last_active) return `Vu ${formatShortDate(user.last_active)}`;
  return 'Hors ligne';
}

function getMessagePreview(message) {
  const text = String(message?.text || '').trim();
  if (text) return text;
  if (message?.attachments?.length) return 'Pièce jointe';
  return 'Message';
}

export default function ChatClient() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [authData, setAuthData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [privateUsers, setPrivateUsers] = useState([]);
  const [membersStatus, setMembersStatus] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [readStatusText, setReadStatusText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    const updateMobileMode = () => setIsMobile(mediaQuery.matches);

    updateMobileMode();
    mediaQuery.addEventListener('change', updateMobileMode);

    return () => mediaQuery.removeEventListener('change', updateMobileMode);
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

  async function refreshChatMeta(chatClient, chatChannel, users, activeUserId) {
    const channelMembers = Object.values(chatChannel?.state?.members || {})
      .map((member) => member?.user)
      .filter(Boolean);

    const baseUsers = users?.length ? users : channelMembers.map((user) => ({ id: user.id, name: user.name || user.id }));
    const userIds = baseUsers.map((user) => user.id).filter(Boolean);

    if (userIds.length) {
      try {
        const response = await chatClient.queryUsers({ id: { $in: userIds } }, {}, { presence: true });
        const statuses = {};
        for (const user of response.users || []) {
          statuses[user.id] = user;
        }
        setMembersStatus(statuses);
      } catch (error) {
        const statuses = {};
        for (const user of channelMembers) {
          statuses[user.id] = user;
        }
        setMembersStatus(statuses);
      }
    }

    try {
      setUnreadCount(chatChannel.countUnread ? chatChannel.countUnread() : 0);
    } catch (error) {
      setUnreadCount(0);
    }

    const otherUser = baseUsers.find((user) => user.id !== activeUserId);
    const readState = chatChannel?.state?.read || {};
    const otherRead = otherUser?.id ? readState[otherUser.id] : null;
    const lastRead = otherRead?.last_read || otherRead?.lastRead;

    if (lastRead) {
      setReadStatusText(`Vu ${formatShortDate(lastRead)}`);
    } else {
      setReadStatusText('Lecture non confirmée');
    }
  }

  useEffect(() => {
    if (!authData) return;

    let cancelled = false;
    let chatClient;
    let subscriptions = [];

    async function connect() {
      try {
        setLoading(true);
        setError('');
        setClient(null);
        setChannel(null);
        setCurrentUser(null);
        setActionMessage('');

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
        await chatChannel.watch({ presence: true });
        await chatChannel.markRead().catch(() => null);

        const channelUsers = Object.values(chatChannel.state.members || {})
          .map((member) => member?.user)
          .filter(Boolean)
          .map((user) => ({ id: user.id, name: user.name || user.id }));
        const usableUsers = session.privateUsers?.length ? session.privateUsers : channelUsers;

        if (!cancelled) {
          setCurrentUser(session.user);
          setPrivateUsers(usableUsers);
          setClient(chatClient);
          setChannel(chatChannel);
          setName(session.user?.id || '');
          refreshChatMeta(chatClient, chatChannel, usableUsers, session.user.id);
        }

        const refresh = () => {
          if (cancelled) return;
          refreshChatMeta(chatClient, chatChannel, usableUsers, session.user.id);
        };

        subscriptions = [
          chatClient.on('user.presence.changed', refresh),
          chatClient.on('message.new', async (event) => {
            if (event.cid === chatChannel.cid) {
              await chatChannel.markRead().catch(() => null);
              refresh();
            }
          }),
          chatClient.on('message.read', refresh),
          chatClient.on('notification.mark_read', refresh),
          chatClient.on('channel.truncated', refresh),
        ];
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
      subscriptions.forEach((subscription) => subscription?.unsubscribe?.());
      if (chatClient) chatClient.disconnectUser();
    };
  }, [authData]);

  async function searchMessages(event) {
    event.preventDefault();
    setActionMessage('');

    const query = searchTerm.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    if (!client || !channel) return;

    try {
      setSearchLoading(true);
      const response = await client.search({ cid: channel.cid }, query, { limit: 10 });
      setSearchResults((response.results || []).map((result) => result.message));
      if (!response.results?.length) {
        setActionMessage('Aucun message trouvé.');
      }
    } catch (err) {
      setActionMessage(err.message || 'Recherche impossible.');
    } finally {
      setSearchLoading(false);
    }
  }

  async function clearConversation() {
    if (!client || !channel) return;

    const adminPassword = window.prompt('Mot de passe administrateur pour effacer la conversation:');
    if (!adminPassword) return;

    const confirmed = window.confirm('Voulez-vous vraiment supprimer définitivement tous les messages ?');
    if (!confirmed) return;

    try {
      setClearLoading(true);
      setActionMessage('');

      const response = await fetch('/api/admin/clear-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, hardDelete: true }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error("API admin introuvable. Vérifiez le fichier app/api/admin/clear-messages/route.js et redéployez Vercel.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer les messages.');
      }

      setSearchResults([]);
      setSearchTerm('');
      setUnreadCount(0);
      setActionMessage(data.message || 'Conversation effacée.');
      await channel.watch({ presence: true }).catch(() => null);
      await channel.markRead().catch(() => null);
    } catch (err) {
      setActionMessage(err.message || 'Erreur pendant la suppression.');
    } finally {
      setClearLoading(false);
    }
  }

  function leaveChat() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    if (client) client.disconnectUser();
    setClient(null);
    setChannel(null);
    setCurrentUser(null);
    setPrivateUsers([]);
    setMembersStatus({});
    setUnreadCount(0);
    setReadStatusText('');
    setSearchTerm('');
    setSearchResults([]);
    setActionMessage('');
    setAuthData(null);
    setPassword('');
  }

  const currentUserName = currentUser?.name || currentUser?.id || 'Utilisateur';
  const otherUsers = privateUsers.filter((user) => user.id !== currentUser?.id);
  const participantsText = privateUsers.length
    ? privateUsers.map((user) => user.name || user.id).join(' · ')
    : 'Conversation privée';
  const primaryOtherUser = otherUsers[0];
  const primaryOtherStatus = primaryOtherUser ? membersStatus[primaryOtherUser.id] : null;

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
            <span><span className="status-dot online" /> En ligne</span>
          </div>
        </div>

        <form className="sidebar-search" onSubmit={searchMessages}>
          <input
            aria-label="Rechercher dans les messages"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un message..."
            value={searchTerm}
          />
          <button disabled={searchLoading} type="submit">
            {searchLoading ? '...' : '🔎'}
          </button>
        </form>

        <div className="conversation-list">
          <p className="section-label">Conversation</p>
          <button className="conversation-item active" type="button">
            <div className="avatar conversation-avatar">💬</div>
            <div className="conversation-text">
              <strong>Conversation privée</strong>
              <span>{primaryOtherUser ? formatPresence(primaryOtherStatus) : participantsText}</span>
              {readStatusText && <small>{readStatusText}</small>}
            </div>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results-panel">
            <p className="section-label">Résultats</p>
            {searchResults.map((message) => (
              <div className="search-result-item" key={message.id}>
                <strong>{message.user?.name || message.user?.id || 'Utilisateur'}</strong>
                <span>{getMessagePreview(message)}</span>
                <small>{formatShortDate(message.created_at)}</small>
              </div>
            ))}
          </div>
        )}

        {actionMessage && <p className="sidebar-action-message">{actionMessage}</p>}

        {otherUsers.length > 0 && (
          <div className="conversation-list participants-list">
            <p className="section-label">Participant</p>
            {otherUsers.map((user) => {
              const status = membersStatus[user.id];
              return (
                <div className="participant-item" key={user.id}>
                  <div className="avatar small-avatar">{getInitials(user.name || user.id)}</div>
                  <div>
                    <strong>{user.name || user.id}</strong>
                    <span>
                      <span className={`status-dot ${status?.online ? 'online' : 'offline'}`} /> {formatPresence(status || user)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <section className="conversation-panel">
        <div className="topbar conversation-topbar">
          <div>
            <strong>Conversation privée</strong>
            <span>{primaryOtherUser ? `${primaryOtherUser.name || primaryOtherUser.id} · ${formatPresence(primaryOtherStatus)}` : participantsText}</span>
            {readStatusText && <small className="topbar-read-state">{readStatusText}</small>}
          </div>

          <div className="topbar-actions">
            <button
              aria-label="Effacer la conversation"
              className="clear-icon-button"
              disabled={clearLoading}
              onClick={clearConversation}
              title="Effacer la conversation"
              type="button"
            >
              <TrashIcon />
            </button>
            <button className="theme-toggle" onClick={toggleDarkMode} type="button">
              <span className="desktop-theme-label">{darkMode ? '☀️ Clair' : '🌙 Sombre'}</span>
              <span className="mobile-theme-label">{darkMode ? '☀️' : '🌙'}</span>
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
              {!isMobile && <Thread />}
            </Channel>
          </Chat>
        </div>
      </section>
    </main>
  );
}
