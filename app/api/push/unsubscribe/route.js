import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

export async function POST(request) {
  try {
    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json(
        { error: 'Variables Vercel manquantes: NEXT_PUBLIC_STREAM_API_KEY et STREAM_API_SECRET.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId || '').trim().toLowerCase();
    const endpoint = String(body.endpoint || '').trim();

    if (!userId || !endpoint) {
      return NextResponse.json({ error: 'userId ou endpoint manquant.' }, { status: 400 });
    }

    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);
    const usersResponse = await serverClient.queryUsers({ id: userId });
    const user = usersResponse.users?.[0];
    const existingSubscriptions = Array.isArray(user?.push_subscriptions) ? user.push_subscriptions : [];
    const nextSubscriptions = existingSubscriptions.filter((item) => item?.endpoint !== endpoint);

    await serverClient.partialUpdateUser({
      id: userId,
      set: {
        push_subscriptions: nextSubscriptions,
      },
    });

    return NextResponse.json({ success: true, subscriptions: nextSubscriptions.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inconnue.' },
      { status: 500 },
    );
  }
}
