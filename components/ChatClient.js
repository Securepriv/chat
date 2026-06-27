'use client';

import { useEffect, useRef, useState } from 'react';
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
const OFFLINE_MESSAGES_KEY = 'private-chat-offline-messages';
const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😊', '😎', '😢', '😡', '👍', '🙏', '👏', '🔥', '❤️', '💔', '🎉', '✅', '❌', '💯', '🤔', '😴', '😭', '😘', '🙌', '✨'];

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

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 17H9M18 8C18 6.41 17.37 4.88 16.24 3.76C15.12 2.63 13.59 2 12 2C10.41 2 8.88 2.63 7.76 3.76C6.63 4.88 6 6.41 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M13.73 21C13.55 21.3 13.29 21.55 12.98 21.72C12.68 21.9 12.34 22 12 22C11.66 22 11.32 21.9 11.02 21.72C10.71 21.55 10.45 21.3 10.27 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
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
  if (user?.last_active) return `Dernière activité ${formatShortDate(user.last_active)}`;
  return 'Hors ligne';
}

function getMessagePreview(message) {
  const text = String(message?.text || '').trim();
  if (text) return text;
  if (message?.attachments?.length) return 'Pièce jointe';
  return 'Nouveau message';
}

function sanitizeMessagesForOffline(messages = []) {
  return messages
    .slice(-30)
    .map((message) => ({
      id: message.id,
      text: getMessagePreview(message),
      created_at: message.created_at,
      user: {
        id: message.user?.id,
        name: message.user?.name || message.user?.id || 'Utilisateur',
      },
    }))
    .filter((message) => message.id);
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);
  } catch (error) {
    // Le navigateur peut bloquer le son tant qu'il n'y a pas eu d'interaction utilisateur.
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function compressImageFile(file, maxSize = 1600, quality = 0.78) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif' || file.size < 450 * 1024) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.round(image.width * ratio);
    const height = Math.round(image.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function ChatClient() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [authData, setAuthData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [privateUsers, setPrivateUsers] = useState([]);
  const [membersStatus, setMembersStatus] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationToast, setNotificationToast] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [offlineMessages, setOfflineMessages] = useState([]);
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const originalTitleRef = useRef('Tchat GetStream');

  useEffect(() => {
    originalTitleRef.current = document.title || 'Tchat GetStream';
    setIsOnline(navigator.onLine);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

    const cachedMessages = window.localStorage.getItem(OFFLINE_MESSAGES_KEY);
    if (cachedMessages) {
      try {
        setOfflineMessages(JSON.parse(cachedMessages));
      } catch (error) {
        window.localStorage.removeItem(OFFLINE_MESSAGES_KEY);
      }
    }

    const savedTheme = window.localStorage.getItem('chat-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedTheme ? savedTheme === 'dark' : prefersDark);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

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
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsStandalone(true);
      setActionMessage('Application installée.');
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    const updateMobileMode = () => setIsMobile(mediaQuery.matches);

    updateMobileMode();
    mediaQuery.addEventListener('change', updateMobileMode);

    return () => mediaQuery.removeEventListener('change', updateMobileMode);
  }, []);

  useEffect(() => {
    function interceptImageUploads(event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length) return;
      if (input.dataset.compressed === 'true') {
        delete input.dataset.compressed;
        return;
      }

      const files = Array.from(input.files);
      if (!files.some((file) => file.type.startsWith('image/') && file.type !== 'image/gif' && file.size >= 450 * 1024)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      Promise.all(files.map((file) => compressImageFile(file)))
        .then((compressedFiles) => {
          const dataTransfer = new DataTransfer();
          compressedFiles.forEach((file) => dataTransfer.items.add(file));
          input.files = dataTransfer.files;
          input.dataset.compressed = 'true';
          input.dispatchEvent(new Event('change', { bubbles: true }));
          setActionMessage('Image compressée avant envoi.');
        })
        .catch(() => {
          input.dataset.compressed = 'true';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    document.addEventListener('change', interceptImageUploads, true);
    return () => document.removeEventListener('change', interceptImageUploads, true);
  }, []);

  useEffect(() => {
    function resetTitleWhenVisible() {
      if (!document.hidden) {
        document.title = originalTitleRef.current;
        if (channel) {
          channel.markRead().catch(() => null);
          setUnreadCount(0);
        }
      }
    }

    document.addEventListener('visibilitychange', resetTitleWhenVisible);
    return () => document.removeEventListener('visibilitychange', resetTitleWhenVisible);
  }, [channel]);

  async function installApp() {
    if (!installPrompt) {
      setActionMessage('Sur Android Chrome: menu ⋮ puis Ajouter à l’écran d’accueil.');
      return;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice.catch(() => null);
    if (result?.outcome === 'accepted') {
      setInstallPrompt(null);
      setIsStandalone(true);
      setActionMessage('Application installée.');
    }
  }

  function cacheRecentMessages(chatChannel) {
    const messages = sanitizeMessagesForOffline(chatChannel?.state?.messages || []);
    setOfflineMessages(messages);
    window.localStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(messages));
  }

  function toggleDarkMode() {
    setDarkMode((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem('chat-theme', nextValue ? 'dark' : 'light');
      return nextValue;
    });
  }

  async function enableNotifications() {
    try {
      if (!('Notification' in window)) {
        setActionMessage('Votre navigateur ne supporte pas les notifications.');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setActionMessage('Votre navigateur ne supporte pas les notifications push Web.');
        return;
      }

      if (!currentUser?.id) {
        setActionMessage('Reconnectez-vous avant d’activer les notifications.');
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setActionMessage('Variable Vercel manquante: NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
        return;
      }

      if (Notification.permission === 'denied') {
        setActionMessage('Notifications bloquées. Activez-les dans les paramètres Chrome.');
        return;
      }

      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

      if (permission !== 'granted') {
        setNotificationsEnabled(false);
        setActionMessage('Notifications non activées.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          subscription: subscription.toJSON(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Impossible d’enregistrer la notification push.');
      }

      setNotificationsEnabled(true);
      setActionMessage('Notifications push activées. Vous pouvez installer le site comme application Android.');
    } catch (error) {
      setNotificationsEnabled(false);
      setActionMessage(error?.message || 'Erreur pendant l’activation des notifications.');
    }
  }

  function showIncomingNotification(message) {
    const sender = message?.user?.name || message?.user?.id || 'Nouveau message';
    const body = getMessagePreview(message);

    setNotificationToast({ sender, body });
    window.setTimeout(() => setNotificationToast(null), 4500);
    playNotificationSound();

    if (document.hidden) {
      setUnreadCount((count) => {
        const nextCount = count + 1;
        document.title = `(${nextCount}) ${originalTitleRef.current}`;
        return nextCount;
      });
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(sender, {
        body,
        icon: '/favicon.ico',
        tag: 'private-chat-message',
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
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

  async function refreshChatMeta(chatClient, chatChannel, users) {
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
      cacheRecentMessages(chatChannel);
    } catch (error) {
      setUnreadCount(0);
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
        if (!document.hidden) await chatChannel.markRead().catch(() => null);

        const channelUsers = Object.values(chatChannel.state.members || {})
          .map((member) => member?.user)
          .filter(Boolean)
          .map((user) => ({ id: user.id, name: user.name || user.id }));
        const usableUsers = session.privateUsers?.length ? session.privateUsers : channelUsers;

        if (!cancelled) {
          setShowLanding(false);
          setCurrentUser(session.user);
          setPrivateUsers(usableUsers);
          setClient(chatClient);
          setChannel(chatChannel);
          setName(session.user?.id || '');
          refreshChatMeta(chatClient, chatChannel, usableUsers);
        }

        const refresh = () => {
          if (cancelled) return;
          refreshChatMeta(chatClient, chatChannel, usableUsers);
        };

        subscriptions = [
          chatClient.on('user.presence.changed', refresh),
          chatClient.on('message.new', async (event) => {
            if (event.cid !== chatChannel.cid) return;

            const fromMe = event.message?.user?.id === session.user.id || event.user?.id === session.user.id;
            if (!fromMe) showIncomingNotification(event.message || event);

            if (!document.hidden) {
              await chatChannel.markRead().catch(() => null);
            }
            refresh();
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

  function insertEmoji(emoji) {
    const textarea = document.querySelector('.messenger-chat-shell textarea');
    if (!textarea) {
      setActionMessage('Cliquez d’abord dans le champ message.');
      return;
    }

    textarea.focus();

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextValue = `${textarea.value.slice(0, start)}${emoji}${textarea.value.slice(end)}`;

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, nextValue);
    } else {
      textarea.value = nextValue;
    }

    textarea.selectionStart = start + emoji.length;
    textarea.selectionEnd = start + emoji.length;

    try {
      textarea.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        data: emoji,
        inputType: 'insertText',
      }));
    } catch (error) {
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    setEmojiOpen(false);
  }

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
    document.title = originalTitleRef.current;
    if (client) client.disconnectUser();
    setClient(null);
    setChannel(null);
    setCurrentUser(null);
    setPrivateUsers([]);
    setMembersStatus({});
    setUnreadCount(0);
    setSearchTerm('');
    setSearchResults([]);
    setActionMessage('');
    setNotificationToast(null);
    setEmojiOpen(false);
    setShowLanding(false);
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
  const recipientName = primaryOtherUser?.name || primaryOtherUser?.id || 'Conversation privée';
  const recipientStatus = primaryOtherUser ? formatPresence(primaryOtherStatus || primaryOtherUser) : participantsText;

  if (!client && !channel && showLanding && !authData && !loading) {
    return (
      <main className={`page landing-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <section className="card landing-card">
          <button className="theme-toggle login-theme-toggle" onClick={toggleDarkMode} type="button">
            {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
          </button>

          <div className="logo">💬</div>
          <h1>Tchat privé sécurisé</h1>
          <p className="subtitle">
            Discutez en privé avec notifications Android, mode sombre, recherche, pièces jointes et emojis.
          </p>

          <div className="landing-actions">
            <button onClick={() => setShowLanding(false)} type="button">Se connecter</button>
            {!isStandalone && (
              <button className="secondary-button" onClick={installApp} type="button">Installer l’application</button>
            )}
            <a className="settings-link" href="/settings">Paramètres</a>
          </div>

          <div className="feature-grid">
            <span>🔔 Notifications</span>
            <span>📎 Fichiers</span>
            <span>😊 Emojis</span>
            <span>🌙 Mode sombre</span>
          </div>

          {actionMessage && <p className="sidebar-action-message">{actionMessage}</p>}
        </section>
      </main>
    );
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
          <p className="subtitle">Connectez-vous pour accéder à votre conversation privée.</p>

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
      {notificationToast && (
        <div className="chat-notification-toast">
          <strong>{notificationToast.sender}</strong>
          <span>{notificationToast.body}</span>
        </div>
      )}

      {!isOnline && (
        <div className="offline-banner">
          Connexion perdue — affichage hors ligne, reconnexion automatique dès que le réseau revient.
        </div>
      )}

      <aside className="chat-sidebar">
        <div className="sidebar-title">Messagerie</div>

        <div className="conversation-list">
          <p className="section-label">Conversation</p>
          <button className="conversation-item active" type="button">
            <div className="avatar conversation-avatar">{getInitials(recipientName)}</div>
            <div className="conversation-text">
              <strong>{recipientName}</strong>
              <span>{recipientStatus}</span>
            </div>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </button>
        </div>

        {actionMessage && <p className="sidebar-action-message">{actionMessage}</p>}
      </aside>

      <section className="conversation-panel">
        <div className="topbar conversation-actions-bar">
          <div className="topbar-recipient">
            <div className="avatar topbar-recipient-avatar">{getInitials(recipientName)}</div>
            <div>
              <strong>{recipientName}</strong>
              <span><span className={`status-dot ${primaryOtherStatus?.online ? 'online' : 'offline'}`} /> {recipientStatus}</span>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              aria-label="Activer les notifications"
              className={`notify-icon-button ${notificationsEnabled ? 'enabled' : ''}`}
              onClick={enableNotifications}
              title={notificationsEnabled ? 'Notifications activées' : 'Activer les notifications'}
              type="button"
            >
              <BellIcon />
            </button>
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

            <div className="profile-menu-wrap">
              <button
                aria-label="Ouvrir le profil et les paramètres"
                className="profile-avatar-button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                title="Profil et paramètres"
                type="button"
              >
                {getInitials(currentUserName)}
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="avatar small-avatar">{getInitials(currentUserName)}</div>
                    <div>
                      <strong>{currentUserName}</strong>
                      <span>Connecté</span>
                    </div>
                  </div>

                  <button onClick={() => { toggleDarkMode(); setProfileMenuOpen(false); }} type="button">
                    {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
                  </button>

                  {!isStandalone && (
                    <button onClick={() => { installApp(); setProfileMenuOpen(false); }} type="button">
                      ⬇️ Installer l’application
                    </button>
                  )}

                  <a href="/settings" onClick={() => setProfileMenuOpen(false)}>⚙️ Paramètres</a>

                  <button className="profile-logout-button" onClick={leaveChat} type="button">
                    <LogoutIcon /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <form className="conversation-search-bar" onSubmit={searchMessages}>
          <input
            aria-label="Rechercher dans les messages"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un message dans cette conversation..."
            value={searchTerm}
          />
          <button disabled={searchLoading} type="submit">{searchLoading ? '...' : 'Rechercher'}</button>
          {searchTerm && (
            <button className="search-clear-button" onClick={() => { setSearchTerm(''); setSearchResults([]); }} type="button">
              Effacer
            </button>
          )}
        </form>

        {searchResults.length > 0 && (
          <div className="conversation-search-results">
            {searchResults.map((message) => (
              <div className="search-result-item" key={message.id}>
                <strong>{message.user?.name || message.user?.id || 'Utilisateur'}</strong>
                <span>{getMessagePreview(message)}</span>
                <small>{formatShortDate(message.created_at)}</small>
              </div>
            ))}
          </div>
        )}

        {!isOnline && offlineMessages.length > 0 && (
          <div className="offline-cache-panel">
            <strong>Derniers messages enregistrés</strong>
            {offlineMessages.slice(-6).map((message) => (
              <div className="offline-cache-item" key={message.id}>
                <span>{message.user?.name || 'Utilisateur'}</span>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
        )}

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

        <div className="emoji-tools">
          {emojiOpen && (
            <div className="emoji-panel">
              {QUICK_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => insertEmoji(emoji)} type="button">
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <button
            aria-label="Ajouter un emoji"
            className="emoji-toggle-button"
            onClick={() => setEmojiOpen((value) => !value)}
            title="Ajouter un emoji"
            type="button"
          >
            😊
          </button>
        </div>
      </section>
    </main>
  );
}
