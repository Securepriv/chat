import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';
import webpush from 'web-push';

export const runtime = 'nodejs';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
const PUSH_USER_IDS = (process.env.PUSH_USER_IDS || 'client,support')
  .split(',')
  .map((id) => id.trim().toLowerCase())
  .filter(Boolean);

function getMessagePreview(message) {
  const text = String(message?.text || '').trim();
  if (text) return text.slice(0, 180);
  if (message?.attachments?.length) return 'Pièce jointe';
  return 'Vous avez reçu un nouveau message.';
}

async function removeDeadSubscription(serverClient, user, endpoint) {
  const subscriptions = Array.isArray(user?.push_subscriptions) ? user.push_subscriptions : [];
  const nextSubscriptions = subscriptions.filter((item) => item?.endpoint !== endpoint);

  await serverClient.partialUpdateUser({
    id: user.id,
    set: {
      push_subscriptions: nextSubscriptions,
    },
  });
}

export async function POST(request) {
  try {
    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json(
        { error: 'Variables Stream manquantes.' },
        { status: 500 },
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    if (!signature || !serverClient.verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Signature webhook invalide.' }, { status: 401 });
    }

    const event = JSON.parse(rawBody || '{}');

    if (event.type !== 'message.new') {
      return NextResponse.json({ success: true, ignored: true });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('Variables VAPID manquantes. Push non envoyé.');
      return NextResponse.json({ success: true, pushSkipped: 'VAPID variables missing' });
    }

    const message = event.message;
    const senderId = String(message?.user?.id || event.user?.id || '').toLowerCase();

    if (!message || !senderId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const recipientIds = PUSH_USER_IDS.filter((id) => id !== senderId);
    if (!recipientIds.length) {
      return NextResponse.json({ success: true, ignored: true });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const usersResponse = await serverClient.queryUsers({ id: { $in: recipientIds } });
    const recipients = usersResponse.users || [];
    const payload = JSON.stringify({
      title: message.user?.name || message.user?.id || 'Nouveau message',
      body: getMessagePreview(message),
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `private-chat-${event.cid || 'message'}`,
      url: '/',
    });

    let sent = 0;
    let failed = 0;

    for (const user of recipients) {
      const subscriptions = Array.isArray(user.push_subscriptions) ? user.push_subscriptions : [];

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(subscription, payload, {
            TTL: 60 * 60 * 24,
            urgency: 'high',
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await removeDeadSubscription(serverClient, user, subscription.endpoint).catch(() => null);
          } else {
            console.error('Erreur push:', error);
          }
        }
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inconnue.' },
      { status: 500 },
    );
  }
}
