# Application tchat: GitHub + Vercel + GetStream

Application de tchat simple créée avec **Next.js**, **Vercel** et **GetStream Chat**.
Aucune installation locale n'est obligatoire: vous pouvez créer les fichiers directement dans GitHub puis déployer avec Vercel.

## 1. Créer l'application GetStream

1. Ouvrez https://dashboard.getstream.io/
2. Créez une application Chat.
3. Copiez:
   - **API Key**
   - **API Secret**

Important: l'API Secret doit rester côté serveur. Ne le mettez jamais dans le code visible par le navigateur.

## 2. Mettre le code sur GitHub sans installation locale

Méthode simple:

1. Créez un nouveau repository GitHub.
2. Cliquez sur **Add file** → **Create new file**.
3. Recréez chaque fichier de ce projet avec le même chemin:
   - `package.json`
   - `.gitignore`
   - `README.md`
   - `app/layout.js`
   - `app/page.js`
   - `app/globals.css`
   - `app/api/token/route.js`
   - `components/ChatClient.js`
4. Committez les fichiers.

Alternative: téléchargez ce dossier puis utilisez l'interface web GitHub **Add file → Upload files**.

## 3. Déployer sur Vercel

1. Ouvrez https://vercel.com/new
2. Importez votre repository GitHub.
3. Dans **Environment Variables**, ajoutez:

```bash
NEXT_PUBLIC_STREAM_API_KEY=votre_api_key_getstream
STREAM_API_SECRET=votre_secret_getstream
```

Optionnel:

```bash
STREAM_CHANNEL_ID=general
```

4. Cliquez sur **Deploy**.

## 4. Tester

1. Ouvrez l'URL Vercel.
2. Entrez un nom.
3. Ouvrez la même URL dans un autre navigateur ou téléphone.
4. Entrez un autre nom et envoyez des messages.

## Notes importantes

- Cette version est une **démo simple**: l'utilisateur entre seulement son nom.
- Pour une vraie application publique, ajoutez une authentification réelle: Clerk, Auth0, Supabase Auth, NextAuth, etc.
- Le token GetStream est généré dans `app/api/token/route.js`, donc le secret reste protégé sur Vercel.
