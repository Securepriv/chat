import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const CHANNEL_ID = process.env.STREAM_CHANNEL_ID || 'private-client-support';

// Les 2 seuls utilisateurs autorisés dans ce tchat privé.
// Les mots de passe ne sont PAS ici: ils sont dans les variables Vercel.
const PRIVATE_USERS = [
  { id: 'tanjona', name: 'Tanjona', passwordEnv: 'CHAT_TANJONA_PASSWORD' },
  { id: 'nadia', name: 'Nadia', passwordEnv: 'CHAT_NADIA_PASSWORD' },
];

function makeUserId(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function safeCompare(a, b) {
  const first = Buffer.from(String(a || ''), 'utf8');
  const second = Buffer.from(String(b || ''), 'utf8');

  if (first.length !== second.length) return false;
  return timingSafeEqual(first, second);
}

export async function POST(request) {
  try {
    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json(
        {
          error:
            'Variables Vercel manquantes: NEXT_PUBLIC_STREAM_API_KEY et STREAM_API_SECRET.',
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedName = String(body.name || '').trim().slice(0, 60);
    const requestedPassword = String(body.password || '');
    const requestedUserId = makeUserId(requestedName);

    const selectedUser = PRIVATE_USERS.find((user) => user.id === requestedUserId);

    if (!selectedUser) {
      return NextResponse.json(
        {
          error:
            'Utilisateur non autorisé. Utilisez seulement: client ou support.',
        },
        { status: 403 },
      );
    }

    const expectedPassword = process.env[selectedUser.passwordEnv];

    if (!expectedPassword) {
      return NextResponse.json(
        {
          error: `Variable Vercel manquante: ${selectedUser.passwordEnv}`,
        },
        { status: 500 },
      );
    }

    if (!safeCompare(requestedPassword, expectedPassword)) {
      return NextResponse.json(
        {
          error: 'Mot de passe incorrect.',
        },
        { status: 401 },
      );
    }

    const publicUsers = PRIVATE_USERS.map(({ id, name }) => ({ id, name }));
    const publicSelectedUser = { id: selectedUser.id, name: selectedUser.name };

    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    // On crée/met à jour les 2 utilisateurs privés.
    await serverClient.upsertUsers(publicUsers);

    // On crée un canal privé avec seulement ces 2 membres.
    const channel = serverClient.channel('messaging', CHANNEL_ID, {
      name: 'Conversation privée',
      members: publicUsers.map((user) => user.id),
      created_by_id: selectedUser.id,
    });

    try {
      await channel.create();
    } catch (error) {
      // Le canal existe probablement déjà: ce n'est pas bloquant.
    }

    // Sécurité: on vérifie que les 2 membres sont bien dans le canal.
    try {
      await channel.addMembers(publicUsers.map((user) => user.id));
    } catch (error) {
      // Si les membres existent déjà, on continue.
    }

    const token = serverClient.createToken(selectedUser.id);

    return NextResponse.json({
      apiKey: STREAM_API_KEY,
      token,
      channelId: CHANNEL_ID,
      channelType: 'messaging',
      privateUsers: publicUsers,
      user: publicSelectedUser,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inconnue.' },
      { status: 500 },
    );
  }
}
