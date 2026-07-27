import React, { useState, useEffect, lazy, Suspense } from 'react';
import { auth } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, where, increment, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firebase-errors';
import { 
  Activity,
  Bell, 
  Search,
  UserCircle,
  LogOut,
  CheckCircle2,
  Mail,
  MessageCircle,
  Menu,
  X,
  AlertCircle,
  Tv,
  Home,
  Share2,
  Sparkles, 
  Users,
  Store,
  Link as LinkIcon,
  LayoutDashboard,
  Youtube,
  Facebook,
  Instagram,
  MessageSquare,
  Camera,
  Palette,
  ShoppingCart,
  Tag,
  Phone,
  Gift,
  Play,
  Heart,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Send
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Progress } from './components/ui/progress';
import { BackgroundSlider } from './components/BackgroundSlider';

const FeedPage = lazy(() => import('./pages/FeedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const AiInsightsPage = lazy(() => import('./pages/AiInsightsPage'));
const NetworkPage = lazy(() => import('./pages/NetworkPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ConnectTvPage = lazy(() => import('./pages/ConnectTvPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Activity className="h-8 w-8 text-primary animate-pulse" />
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLinkText, setCopiedLinkText] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['feed', 'profile', 'overview', 'connections', 'ai', 'network', 'gallery', 'connect-tv'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabSelect = (tabName: string) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.warn(e);
    }
  };

  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [tvQueue, setTvQueue] = useState<any[]>([]);
  const [newTvVideoUrl, setNewTvVideoUrl] = useState('');
  const [isAddingToTv, setIsAddingToTv] = useState(false);
  const [showTvHelper, setShowTvHelper] = useState(false);
  
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isCommenting, setIsCommenting] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chattingWith, setChattingWith] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [tvChatMessages, setTvChatMessages] = useState<any[]>([]);
  const [newTvChatMessage, setNewTvChatMessage] = useState('');
  const [isSendingTvChat, setIsSendingTvChat] = useState(false);
  const lastTvChatTimeRef = React.useRef<number>(0);
  const lastQueueTimeRef = React.useRef<number>(0);

  const logSecurityEvent = async (userId: string, eventType: string, details: string) => {
    try {
      await addDoc(collection(db, 'security_logs'), {
        userId,
        eventType,
        details,
        createdAt: Date.now()
      });
    } catch (e) {
      console.warn('Security log recording warning:', e);
    }
  };
  
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    tags: '',
    color: 'bg-blue-500',
    youtube: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    whatsapp: '',
    youtubeConnected: false,
    instagramConnected: false,
    tiktokConnected: false,
    facebookConnected: false,
    photoURL: '',
    coverURL: '',
  });
  const [networkConnections, setNetworkConnections] = useState<Record<number, boolean>>({});

  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const handleComingSoon = () => {
    alert("Esta funcionalidade estará disponível em breve!");
  };

  const toggleNetworkConnection = (id: number) => {
    setNetworkConnections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'user',
              createdAt: serverTimestamp(),
              displayName: currentUser.displayName || '',
            });
            setProfileData(prev => ({ ...prev, displayName: currentUser.displayName || '' }));
          } else {
            const data = userSnap.data();
            setProfileData({
              displayName: data.displayName || '',
              bio: data.bio || '',
              tags: data.tags || '',
              color: data.color || 'bg-blue-500',
              youtube: data.youtube || '',
              instagram: data.instagram || '',
              tiktok: data.tiktok || '',
              facebook: data.facebook || '',
              whatsapp: data.whatsapp || '',
              youtubeConnected: data.youtubeConnected || false,
              instagramConnected: data.instagramConnected || false,
              tiktokConnected: data.tiktokConnected || false,
              facebookConnected: data.facebookConnected || false,
              photoURL: data.photoURL || '',
              coverURL: data.coverURL || '',
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tv_queue'), orderBy('submittedAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queueData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTvQueue(queueData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tv_queue');
    });

    const chatQ = query(collection(db, 'tv_chat'), orderBy('createdAt', 'desc'), limit(50));
    const unsubChat = onSnapshot(chatQ, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTvChatMessages(msgs.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tv_chat');
    });

    return () => {
      unsubscribe();
      unsubChat();
    };
  }, []);

  useEffect(() => {
    if (tvQueue.length === 0) return;
    const playing = tvQueue.find(v => v.status === 'playing');
    const pending = tvQueue.filter(v => v.status === 'pending');
    if (!playing && pending.length > 0) {
      updateDoc(doc(db, 'tv_queue', pending[0].id), { status: 'playing' }).catch(console.error);
    }
  }, [tvQueue]);

  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setMessages([]);
      return;
    }
    const pq = query(collection(db, 'purchases'), where('userId', '==', user.uid));
    const unsubP = onSnapshot(pq, (snapshot) => {
      setPurchases(snapshot.docs.map(doc => doc.data()));
    }, error => handleFirestoreError(error, OperationType.LIST, 'purchases'));

    const mq = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsubM = onSnapshot(mq, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'messages'));

    return () => {
      unsubP();
      unsubM();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uq = query(collection(db, 'users'));
    const unsub = onSnapshot(uq, (snapshot) => {
      setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsub();
  }, [user]);

  const handleEmailAuth = async (isSignUp: boolean) => {
    setAuthError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Por favor, insira um email válido.');
      return;
    }
    if (password.length < 8) {
      setAuthError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (isSignUp && !/(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      setAuthError('A senha deve conter pelo menos uma letra maiúscula e um número.');
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Este email já está em uso.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setAuthError('Credenciais inválidas. Verifique seu email e senha.');
      } else {
        setAuthError('Erro na autenticação. Tente novamente mais tarde.');
      }
    }
  };

  const toggleConnection = async (platform: 'youtubeConnected' | 'instagramConnected' | 'tiktokConnected' | 'facebookConnected') => {
    if (!user) return;
    const newValue = !profileData[platform];
    setProfileData(prev => ({ ...prev, [platform]: newValue }));
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { [platform]: newValue });
    } catch (error) {
      console.error(`Error toggling ${platform}:`, error);
      setProfileData(prev => ({ ...prev, [platform]: !newValue }));
    }
  };
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photoURL' | 'coverURL') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const maxWidth = type === 'photoURL' ? 800 : 1920;
      const maxHeight = type === 'photoURL' ? 800 : 1080;
      const base64Image = await resizeImage(file, maxWidth, maxHeight);
      
      const storagePath = `users/${user.uid}/${type}_${Date.now()}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, base64Image, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      
      setProfileData(prev => ({ ...prev, [type]: downloadUrl }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erro ao fazer upload da imagem.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: profileData.displayName,
        bio: profileData.bio,
        tags: profileData.tags,
        color: profileData.color,
        youtube: profileData.youtube,
        instagram: profileData.instagram,
        tiktok: profileData.tiktok,
        facebook: profileData.facebook,
        whatsapp: profileData.whatsapp,
        youtubeConnected: profileData.youtubeConnected,
        instagramConnected: profileData.instagramConnected,
        tiktokConnected: profileData.tiktokConnected,
        facebookConnected: profileData.facebookConnected,
        photoURL: profileData.photoURL,
        coverURL: profileData.coverURL,
      });
      alert('Perfil salvo com sucesso!');
    } catch (error) {
      console.error("Error saving profile:", error);
      alert('Erro ao salvar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !newPostContent.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorHandle: `@${(profileData.displayName || user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '')}`,
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        content: newPostContent.trim(),
        likes: 0,
        comments: 0,
        createdAt: Date.now()
      });
      setNewPostContent('');
    } catch (error) {
      console.error('Error publishing post:', error);
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      alert('Erro ao publicar o post.');
    } finally {
      setIsPosting(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleBuyGalleryItem = async (itemId: string, title: string, price: number) => {
    if (!user) return;
    setIsPurchasing(true);
    try {
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        itemId: itemId,
        title: title,
        price: price,
        createdAt: Date.now()
      });
      alert('Compra efetuada com sucesso!');
    } catch (e) {
      console.error('Error purchasing item:', e);
      handleFirestoreError(e, OperationType.CREATE, 'purchases');
      alert('Erro na compra.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const toggleComments = async (postId: string) => {
    const isExpanded = !!expandedComments[postId];
    setExpandedComments({ ...expandedComments, [postId]: !isExpanded });
    
    if (!isExpanded && !postComments[postId]) {
      const unsub = onSnapshot(
        query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')),
        (snapshot) => {
          setPostComments(prev => ({
            ...prev,
            [postId]: snapshot.docs.map(doc => doc.data())
          }));
        },
        error => handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`)
      );
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId] || '';
    if (!user || !content.trim()) return;
    setIsCommenting({ ...isCommenting, [postId]: true });
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        content: content.trim(),
        createdAt: Date.now()
      });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        await updateDoc(postRef, { comments: (postDoc.data().comments || 0) + 1 });
      }
    } catch (e) {
      console.error('Error adding comment:', e);
      handleFirestoreError(e, OperationType.CREATE, `posts/${postId}/comments`);
      alert('Erro ao adicionar comentário.');
    } finally {
      setIsCommenting({ ...isCommenting, [postId]: false });
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
    } catch (e) {
      console.error('Error liking post', e);
      handleFirestoreError(e, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleSendTvChatMessage = async () => {
    if (!user || !newTvChatMessage.trim()) return;
    
    const now = Date.now();
    if (now - lastTvChatTimeRef.current < 2000) {
      alert('Proteção Anti-Spam: Por favor aguarde 2 segundos entre mensagens.');
      logSecurityEvent(user.uid, 'RATE_LIMIT_TRIGGERED', 'Live chat spam protection triggered');
      return;
    }
    lastTvChatTimeRef.current = now;

    setIsSendingTvChat(true);
    try {
      await addDoc(collection(db, 'tv_chat'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        content: newTvChatMessage.trim(),
        createdAt: Date.now()
      });
      setNewTvChatMessage('');
    } catch (e) {
      console.error('Error sending message:', e);
      handleFirestoreError(e, OperationType.CREATE, 'tv_chat');
      alert('Erro ao enviar mensagem no chat.');
    } finally {
      setIsSendingTvChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !chattingWith || !newMessage.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: chattingWith.id,
        participants: [user.uid, chattingWith.id],
        senderName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        senderAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        content: newMessage.trim(),
        createdAt: Date.now()
      });
      setNewMessage('');
    } catch (e) {
      console.error('Error sending message:', e);
      handleFirestoreError(e, OperationType.CREATE, 'messages');
      alert('Erro ao enviar mensagem.');
    }
  };

  const handleAddToTvQueue = async (videoUrl: string, title?: string) => {
    if (!user || !videoUrl.trim()) return;

    const now = Date.now();
    if (now - lastQueueTimeRef.current < 10000) {
      alert('Proteção Anti-Spam: Aguarde 10 segundos antes de enviar outro vídeo para a TV.');
      logSecurityEvent(user.uid, 'RATE_LIMIT_QUEUE', 'Jukebox rate limit triggered');
      return;
    }

    setIsAddingToTv(true);
    
    let finalTitle = title || 'Novo Vídeo na Connect TV';
    let thumbnailUrl = 'https://picsum.photos/seed/tv/800/450';
    let isYoutube = false;
    let embedUrl = videoUrl;
    
    const ytId = extractYoutubeId(videoUrl);
    if (ytId) {
      isYoutube = true;
      thumbnailUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
      embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
    } else if (videoUrl.includes('picsum.photos')) {
      thumbnailUrl = videoUrl;
      embedUrl = videoUrl;
    } else if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      alert('URL inválida. Envie um link válido do YouTube.');
      setIsAddingToTv(false);
      return;
    }

    try {
      await addDoc(collection(db, 'tv_queue'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        videoUrl: embedUrl,
        thumbnailUrl: thumbnailUrl,
        title: finalTitle,
        status: tvQueue.length === 0 ? 'playing' : 'pending',
        submittedAt: Date.now()
      });
      lastQueueTimeRef.current = now;
      logSecurityEvent(user.uid, 'JUKEBOX_SUBMITTED', `Video submitted: ${finalTitle}`);
      setNewTvVideoUrl('');
      setShowTvHelper(false);
    } catch (error) {
      console.error('Error adding to TV Queue:', error);
      handleFirestoreError(error, OperationType.CREATE, 'tv_queue');
      alert('Erro ao enviar vídeo para a TV.');
    } finally {
      setIsAddingToTv(false);
    }
  };

  const handleLogin = async (providerName: 'google' | 'microsoft' | 'yahoo') => {
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'microsoft') {
        provider = new OAuthProvider('microsoft.com');
      } else if (providerName === 'yahoo') {
        provider = new OAuthProvider('yahoo.com');
      }
      
      if (provider) {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Erro ao fazer login. Certifique-se de que o provedor está ativado no Firebase Console.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <Activity className="h-10 w-10 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <BackgroundSlider />
        <div className="flex h-screen w-full items-center justify-center">
          <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center space-y-6 flex flex-col items-center mx-4 border border-white/20 shadow-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Connected</h1>
              <p className="text-slate-700 font-medium text-base">O teu centro de controlo do mundo digital.</p>
            </div>
            
            <div className="w-full space-y-3 pt-4">
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-sm h-11 rounded-xl shadow-sm hover:scale-[1.02] transition-transform bg-white/80 border-white/40 text-slate-900 font-semibold" 
                onClick={() => handleLogin('google')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-sm h-11 rounded-xl shadow-sm hover:scale-[1.02] transition-transform bg-white/80 border-white/40 text-slate-900 font-semibold" 
                onClick={() => handleLogin('microsoft')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 21 21">
                  <path fill="#f35325" d="M1 1h9v9H1z"/><path fill="#81bc06" d="M11 1h9v9h-9z"/><path fill="#05a6f0" d="M1 11h9v9H1z"/><path fill="#ffba08" d="M11 11h9v9h-9z"/>
                </svg>
                Continuar com Microsoft
              </Button>

              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-sm h-11 rounded-xl shadow-sm hover:scale-[1.02] transition-transform bg-white/80 border-white/40 text-slate-900 font-semibold" 
                onClick={() => handleLogin('yahoo')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#6001D2">
                  <path d="M22.77 4.5l-8.6 11.83v7.17h-4.34v-7.17L1.23 4.5h4.86l5.91 8.82 5.91-8.82z"/>
                </svg>
                Continuar com Yahoo
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-slate-600 font-bold">Ou</span>
                </div>
              </div>

              {showEmailLogin ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  {authError && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-600 text-sm p-3 rounded-xl flex items-start gap-2 text-left">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="font-medium">{authError}</p>
                    </div>
                  )}
                  <input 
                    type="email" 
                    placeholder="Seu email" 
                    className="w-full glass-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 font-medium placeholder:text-slate-500 shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input 
                    type="password" 
                    placeholder="Sua senha" 
                    className="w-full glass-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 font-medium placeholder:text-slate-500 shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-xl shadow-md font-bold" onClick={() => handleEmailAuth(false)}>Entrar</Button>
                    <Button variant="secondary" className="flex-1 rounded-xl shadow-md font-bold" onClick={() => handleEmailAuth(true)}>Criar Conta</Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-slate-700" onClick={() => setShowEmailLogin(false)}>Voltar</Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full text-sm h-11 rounded-xl shadow-sm hover:scale-[1.02] transition-transform bg-white/80 border-white/40 text-slate-900 font-semibold" 
                  onClick={() => setShowEmailLogin(true)}
                >
                  <Mail className="mr-2 h-5 w-5 text-slate-700" />
                  Continuar com Email
                </Button>
              )}
            </div>

            <p className="text-xs text-slate-700 font-medium mt-4">
              Ao continuar, você concorda com nossos Termos de Serviço.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackgroundSlider />
      <div className="flex h-screen w-full text-slate-900 overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-col glass border-r-0 transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 sm:flex shadow-xl border-white/20 ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/20">
          <div className="flex items-center gap-3 font-bold text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-2xl tracking-tight">Connected</span>
          </div>
          <button className="sm:hidden text-slate-700" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-6">
          <nav className="grid items-start px-4 text-sm font-medium gap-2">
            <button 
              onClick={() => handleTabSelect('feed')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'feed' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <Home className="h-5 w-5" />
              Feed Principal
            </button>
            <button 
              onClick={() => handleTabSelect('profile')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'profile' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <UserCircle className="h-5 w-5" />
              Meu Perfil
            </button>
            <button 
              onClick={() => handleTabSelect('overview')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'overview' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            <button 
              onClick={() => handleTabSelect('connections')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'connections' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <LinkIcon className="h-5 w-5" />
              Integrações
            </button>
            <button 
              onClick={() => handleTabSelect('ai')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'ai' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <Sparkles className="h-5 w-5" />
              IA Insights
            </button>
            <button 
              onClick={() => handleTabSelect('network')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'network' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <Users className="h-5 w-5" />
              Networking
            </button>
            <button 
              onClick={() => handleTabSelect('gallery')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'gallery' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <Store className="h-5 w-5" />
              Galeria (Loja)
            </button>
            <button 
              onClick={() => handleTabSelect('connect-tv')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'connect-tv' ? 'bg-white/60 text-primary shadow-sm' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'}`}
            >
              <Tv className="h-5 w-5" />
              Connect TV
            </button>
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card className="glass-card border-white/40 shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-slate-900">Nível Criador: Ouro</CardTitle>
              <CardDescription className="text-slate-700 font-medium">Faltam 2.4k XP para Platina</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Progress value={75} className="h-2 bg-white/50" />
            </CardContent>
          </Card>
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 mt-2 w-full text-slate-700 hover:bg-white/40 hover:text-rose-600 transition-all font-semibold text-sm">
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden relative z-0 w-full">
        <header className="flex h-16 items-center gap-4 border-b border-white/20 glass px-4 sm:px-6 justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 w-full flex-1">
            <button 
              className="sm:hidden p-2 -ml-2 text-slate-700 hover:bg-white/40 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <form className="flex-1 max-w-md" onSubmit={(e) => { e.preventDefault(); handleComingSoon(); }}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  placeholder="Pesquisar..."
                  className="w-full appearance-none glass-input shadow-none h-10 rounded-xl px-4 pl-10 py-2 text-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-slate-900 font-medium"
                />
              </div>
            </form>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="default" 
              size="sm" 
              className="h-10 px-3 sm:px-4 rounded-xl shadow-md font-bold text-xs sm:text-sm flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-all"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Partilhar Link da Rede</span>
              <span className="sm:hidden">Partilhar</span>
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl glass-input border-white/40 text-slate-700 hover:text-slate-900 shadow-sm" onClick={handleComingSoon}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificações</span>
            </Button>
            <Avatar className="h-10 w-10 border border-white/40 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => handleTabSelect('profile')}>
              <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'feed' && (
              <FeedPage
                user={user}
                profileData={profileData}
                posts={posts}
                newPostContent={newPostContent}
                setNewPostContent={setNewPostContent}
                isPosting={isPosting}
                handlePublish={handlePublish}
                handleLikePost={handleLikePost}
                toggleComments={toggleComments}
                expandedComments={expandedComments}
                postComments={postComments}
                commentInputs={commentInputs}
                setCommentInputs={setCommentInputs}
                handleAddComment={handleAddComment}
                isCommenting={isCommenting}
                handleComingSoon={handleComingSoon}
              />
            )}
            {activeTab === 'profile' && (
              <ProfilePage
                user={user}
                profileData={profileData}
                setProfileData={setProfileData}
                isSaving={isSaving}
                handleSaveProfile={handleSaveProfile}
                photoInputRef={photoInputRef}
                coverInputRef={coverInputRef}
                handleImageUpload={handleImageUpload}
              />
            )}
            {activeTab === 'overview' && (
              <DashboardPage handleComingSoon={handleComingSoon} />
            )}
            {activeTab === 'connections' && (
              <ConnectionsPage
                user={user}
                profileData={profileData}
                toggleConnection={toggleConnection}
              />
            )}
            {activeTab === 'ai' && (
              <AiInsightsPage handleComingSoon={handleComingSoon} />
            )}
            {activeTab === 'network' && (
              <NetworkPage
                user={user}
                profileData={profileData}
                allUsers={allUsers}
                messages={messages}
                chattingWith={chattingWith}
                setChattingWith={setChattingWith}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
              />
            )}
            {activeTab === 'gallery' && (
              <GalleryPage
                user={user}
                purchases={purchases}
                isPurchasing={isPurchasing}
                handleBuyGalleryItem={handleBuyGalleryItem}
                handleAddToTvQueue={handleAddToTvQueue}
                handleComingSoon={handleComingSoon}
              />
            )}
            {activeTab === 'connect-tv' && (
              <ConnectTvPage
                user={user}
                profileData={profileData}
                tvQueue={tvQueue}
                newTvVideoUrl={newTvVideoUrl}
                setNewTvVideoUrl={setNewTvVideoUrl}
                isAddingToTv={isAddingToTv}
                showTvHelper={showTvHelper}
                setShowTvHelper={setShowTvHelper}
                handleAddToTvQueue={handleAddToTvQueue}
                tvChatMessages={tvChatMessages}
                newTvChatMessage={newTvChatMessage}
                setNewTvChatMessage={setNewTvChatMessage}
                handleSendTvChatMessage={handleSendTvChatMessage}
                isSendingTvChat={isSendingTvChat}
              />
            )}
          </Suspense>
        </div>
      </main>
    </div>

    {/* Modal de Partilha do Link da Rede */}
    {showShareModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <Card className="w-full max-w-lg glass-card border-white/40 shadow-2xl overflow-hidden relative">
          <button 
            onClick={() => setShowShareModal(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200/50 text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Link Oficial da Rede Connected</CardTitle>
                <CardDescription className="text-xs text-slate-600 font-medium">Use estes links diretos e operacionais para aceder ou convidar outros utilizadores.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {copiedLinkText && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{copiedLinkText}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Link Público da Aplicação (Partilhar com Amigos):
              </label>
              <div className="flex gap-2">
                <input 
                  readOnly
                  value="https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app"
                  className="flex-1 bg-white/80 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-semibold selection:bg-primary/20"
                />
                <Button 
                  size="sm" 
                  className="rounded-xl text-xs font-bold shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText("https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app");
                    setCopiedLinkText('Link público copiado com sucesso!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Link de Desenvolvimento Direto (Local/Dev):
              </label>
              <div className="flex gap-2">
                <input 
                  readOnly
                  value="https://ais-dev-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app"
                  className="flex-1 bg-white/80 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-semibold selection:bg-primary/20"
                />
                <Button 
                  variant="outline"
                  size="sm" 
                  className="rounded-xl text-xs font-bold shrink-0 border-slate-300 bg-white/90"
                  onClick={() => {
                    navigator.clipboard.writeText("https://ais-dev-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app");
                    setCopiedLinkText('Link de desenvolvimento copiado!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-700 block mb-2">Atalhos para Módulos Específicos:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => {
                    const link = "https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app/?tab=connect-tv";
                    navigator.clipboard.writeText(link);
                    setCopiedLinkText('Link da Connect TV copiado!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                  className="p-2 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-left font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>📺 Connect TV</span>
                  <span className="text-[10px] text-primary">Copiar</span>
                </button>
                <button 
                  onClick={() => {
                    const link = "https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app/?tab=network";
                    navigator.clipboard.writeText(link);
                    setCopiedLinkText('Link de Networking copiado!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                  className="p-2 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-left font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>🤝 Networking</span>
                  <span className="text-[10px] text-primary">Copiar</span>
                </button>
                <button 
                  onClick={() => {
                    const link = "https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app/?tab=gallery";
                    navigator.clipboard.writeText(link);
                    setCopiedLinkText('Link da Galeria copiado!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                  className="p-2 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-left font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>🛍️ Galeria</span>
                  <span className="text-[10px] text-primary">Copiar</span>
                </button>
                <button 
                  onClick={() => {
                    const link = "https://ais-pre-t2irrv5u27qp7rp3f63ddg-577495117823.europe-west2.run.app/?tab=feed";
                    navigator.clipboard.writeText(link);
                    setCopiedLinkText('Link do Feed copiado!');
                    setTimeout(() => setCopiedLinkText(null), 3000);
                  }}
                  className="p-2 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-left font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>💬 Feed Social</span>
                  <span className="text-[10px] text-primary">Copiar</span>
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-100/60 p-4 border-t border-slate-200/60 flex justify-end">
            <Button variant="default" className="rounded-xl font-bold text-xs" onClick={() => setShowShareModal(false)}>
              Fechar
            </Button>
          </CardFooter>
        </Card>
      </div>
    )}
    </>
  );
}
