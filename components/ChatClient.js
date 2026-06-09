'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelHeader,
  LoadingIndicator,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react';

export default function ChatClient() {
  const [name, setName] = useState('');
  const [loginName, setLoginName] = useState('');
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');

    const cleanedName = name.trim();
    if (!cleanedName) {
      setError('Entrez votre nom pour rejoindre le tchat.');
      return;
    }

    setLoginName(cleanedName);
  }

  useEffect(() => {
    if (!loginName) return;

    let cancelled = false;
    let chatClient;

    async function connect() {
      try {
        setLoading(true);
        setError('');
        setClient(null);
        setChannel(null);

        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: loginName }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Impossible de récupérer le token GetStream.');
        }

        chatClient = new StreamChat(data.apiKey);
        await chatClient.connectUser(data.user, data.token);

        const chatChannel = chatClient.channel('messaging', data.channelId);
        await chatChannel.watch();

        if (!cancelled) {
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
  }, [loginName]);

  function leaveChat() {
    if (client) client.disconnectUser();
    setClient(null);
    setChannel(null);
    setLoginName('');
  }

  if (!client || !channel) {
    return (
      <main className="page">
        <section className="card login-card">
          <div className="logo">💬</div>
          <h1>Tchat en direct</h1>
          <p className="subtitle">
            Application Next.js hébergée sur Vercel avec GetStream Chat.
          </p>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="name">Votre nom</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Amine"
              maxLength={60}
              autoComplete="name"
            />
            <button disabled={loading} type="submit">
              {loading ? 'Connexion...' : 'Rejoindre le salon'}
            </button>
          </form>

          {loading && (
            <div className="loading-line">
              <LoadingIndicator /> Connexion à GetStream...
            </div>
          )}
          {error && <p className="error">{error}</p>}

          <p className="hint">
            Démo simple: tous les utilisateurs rejoignent le salon “général”.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <div className="topbar">
        <div>
          <strong>Tchat GetStream</strong>
          <span>Salon général</span>
        </div>
        <button onClick={leaveChat}>Quitter</button>
      </div>

      <div className="chat-shell">
        <Chat client={client} theme="str-chat__theme-light">
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </main>
  );
}
