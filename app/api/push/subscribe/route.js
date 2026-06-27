import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription.endpoint === 'string' &&
      subscription.keys &&
      typeof subscription.keys.p256dh === 'string' &&
      typeof subscription.keys.auth === 'string',
  );
}

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
    const subscription = body.subscription;

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant.' }, { status: 400 });
    }

    if (!isValidSubscription(subscription)) {
      return NextResponse.json({ error: 'Subscription push invalide.' }, { status: 400 });
    }

    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);
    const usersResponse = await serverClient.queryUsers({ id: userId });
    const user = usersResponse.users?.[0];
    const existingSubscriptions = Array.isArray(user?.push_subscriptions) ? user.push_subscriptions : [];
    const nextSubscriptions = [
      subscription,
      ...existingSubscriptions.filter((item) => item?.endpoint !== subscription.endpoint),
    ].slice(0, 5);

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
