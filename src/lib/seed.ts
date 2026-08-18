// ============================================================================
// Seed de conteúdo de exemplo — ajuda utilizadores a começar a publicar
// ----------------------------------------------------------------------------
// Cria perfis empresariais, uma música de exemplo (áudio público de teste) e
// um post de boas-vindas. Corre a partir da app (utilizador autenticado).
// ============================================================================
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const DEMO_AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const DEMO_COVER = 'https://picsum.photos/seed/connected-music/400/400';

export async function seedDemoBusinesses(user: any, ownerName: string): Promise<void> {
  const examples = [
    {
      name: 'Connected Store',
      category: 'Tecnologia',
      description: 'Loja oficial de produtos Connected: merchandise, acessórios e criatividade digital.',
      website: 'https://www.connectedking.web.app',
      email: 'loja@connected.com',
    },
    {
      name: 'Estúdio Génesis',
      category: 'Música',
      description: 'Estúdio independente que apoia novos artistas na Connected Music.',
      website: '',
      email: 'estudio@connected.com',
    },
  ];
  for (const ex of examples) {
    await addDoc(collection(db, 'businessProfiles'), {
      ownerId: user.uid,
      ownerName,
      ...ex,
      createdAt: serverTimestamp(),
    });
  }
}

export async function seedDemoMusic(user: any, artistName: string): Promise<void> {
  await addDoc(collection(db, 'music'), {
    artistId: user.uid,
    artistName,
    artistAvatar: user.photoURL || undefined,
    title: 'Música de Exemplo — Connected',
    cover: DEMO_COVER,
    audioUrl: DEMO_AUDIO,
    genre: 'Afrobeat',
    description: 'Faixa de exemplo para te inspirares a publicar a tua própria música na Connected Music.',
    duration: 372,
    plays: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    downloads: 0,
    rights: 'original',
    createdAt: serverTimestamp(),
  });
}

export async function seedDemoPost(user: any, authorName: string): Promise<void> {
  await addDoc(collection(db, 'posts'), {
    userId: user.uid,
    authorName,
    authorAvatar: user.photoURL || undefined,
    content: 'Bem-vindo à Connected! 🎵 Publica a tua música, cria o teu negócio e deixa o DIVINO ajudar-te a crescer.',
    createdAt: serverTimestamp(),
    likes: 0,
    comments: 0,
  });
}
