import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const CHANNEL_ID = process.env.STREAM_CHANNEL_ID || 'private-client-support';
const ADMIN_CLEAR_PASSWORD = process.env.ADMIN_CLEAR_PASSWORD;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'admin';

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

    if (!ADMIN_CLEAR_PASSWORD) {
      return NextResponse.json(
        {
          error: 'Variable Vercel manquante: ADMIN_CLEAR_PASSWORD.',
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const password = String(body.password || '');
    const hardDelete = body.hardDelete !== false;

    if (!safeCompare(password, ADMIN_CLEAR_PASSWORD)) {
      return NextResponse.json(
        {
          error: 'Mot de passe administrateur incorrect.',
        },
        { status: 401 },
      );
    }

    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    await serverClient.upsertUser({
      id: ADMIN_USER_ID,
      name: 'Admin',
    });

    const channel = serverClient.channel('messaging', CHANNEL_ID);

    await channel.truncate({
      hard_delete: hardDelete,
      skip_push: true,
      user_id: ADMIN_USER_ID,
    });

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? 'Tous les messages ont été supprimés définitivement.'
        : 'Tous les messages ont été masqués dans le tchat.',
      channelId: CHANNEL_ID,
      hardDelete,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inconnue.' },
      { status: 500 },
    );
  }
}
