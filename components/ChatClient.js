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

const PRIVATE_USERS = [
  { id: 'client', name: 'Client' },
  { id: 'support', name: 'Support' },
];

export default function ChatClient() {
  const [name, setName] = useState('client');
  const [password, setPassword] = useState('');
  const [loginData, setLoginData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');

    const cleanedName = String(name || '').trim().toLowerCase();
    if (!cleanedName) {
      setError('Choisissez Client ou Support.');
      return;
    }

    if (!password) {
      setError('Entrez le mot de passe.');
      return;
    }

    setLoginData({ name: cleanedName, password });
  }

  function selectUser(userId) {
    setError('');
    setName(userId);
    setPassword('');
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
      <main className="page">
        <section className="card login-card">
          <div className="logo">🔒</div>
          <h1>Tchat privé</h1>
          <p className="subtitle">
            Conversation privée GetStream entre seulement deux utilisateurs protégés par mot de passe.
          </p>

          <div className="quick-users">
            {PRIVATE_USERS.map((user) => (
              <button
                className={name === user.id ? 'selected' : ''}
                key={user.id}
                disabled={loading}
                type="button"
                onClick={() => selectUser(user.id)}
              >
                Je suis {user.name}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="name">Utilisateur</label>
            <select
              id="name"
              value={name}
              onChange={(event) => selectUser(event.target.value)}
              disabled={loading}
            >
              {PRIVATE_USERS.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Entrez le mot de passe"
              type="password"
              autoComplete="current-password"
            />

            <button disabled={loading} type="submit">
              {loading ? 'Connexion...' : 'Rejoindre le tchat privé'}
            </button>
          </form>

          {loading && (
            <div className="loading-line">
              <LoadingIndicator /> Connexion à GetStream...
            </div>
          )}
          {error && <p className="error">{error}</p>}

          <p className="hint">
            Pour tester: ouvrez cette page deux fois. Une fois comme Client, une fois comme Support.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <div className="topbar">
        <div>
          <strong>Conversation privée</strong>
          <span>Connecté comme {currentUser?.name || loginData?.name}</span>
        </div>
        <button onClick={leaveChat}>Quitter</button>
      </div>

      <div className="chat-shell">
        <Chat client={client} theme="str-chat__theme-light">
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
