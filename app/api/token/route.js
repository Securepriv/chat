import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const CHANNEL_ID = process.env.STREAM_CHANNEL_ID || 'general';

function makeUserId(name) {
  const clean = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  return clean || `invite_${Date.now()}`;
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
    const displayName = String(body.name || '').trim().slice(0, 60);

    if (!displayName) {
      return NextResponse.json({ error: 'Veuillez entrer un nom.' }, { status: 400 });
    }

    const userId = makeUserId(displayName);
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    await serverClient.upsertUser({
      id: userId,
      name: displayName,
    });

    const channel = serverClient.channel('messaging', CHANNEL_ID, {
      name: 'Salon général',
      created_by_id: userId,
    });

    try {
      await channel.create();
    } catch (error) {
      // Le salon existe probablement déjà: ce n'est pas bloquant.
    }

    try {
      await channel.addMembers([userId]);
    } catch (error) {
      // Si l'utilisateur est déjà membre, on continue.
    }

    const token = serverClient.createToken(userId);

    return NextResponse.json({
      apiKey: STREAM_API_KEY,
      token,
      channelId: CHANNEL_ID,
      user: {
        id: userId,
        name: displayName,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inconnue.' },
      { status: 500 },
    );
  }
}
