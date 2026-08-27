import React, { useState, useEffect, lazy, Suspense, useRef, useCallback, useMemo } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import BackgroundLayer from './components/BackgroundLayer';
import { auth } from './firebase';
import { initConnectedStorage } from './lib/cloud-storage/init';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
  GoogleAuthProvider, 
  OAuthProvider, 
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  getMultiFactorResolver,
  MultiFactorResolver,
  TotpMultiFactorGenerator
} from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, where, increment, limit, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firebase-errors';
import { registerSession, getSessionVersion, setSessionVersion, getDeviceInfo } from './lib/security-utils';
import { publishMediaPost } from './lib/upload-engine';
import { uploadToCcs } from './lib/ccs/upload';
import { 
  Bell, 
  Search,
  UserCircle,
  LogOut,
  CheckCircle2,
  Download,
  Mail,
  MessageCircle,
  Menu,
  X,
  AlertCircle,
  ShieldAlert,
  Tv,
  Music,
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
  Send,
  Settings,
  Gamepad2,
  Globe,
  PhoneOff,
  Building2,
  Github,
  Briefcase,
  Cloud,
  Wallet, Server} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Progress } from './components/ui/progress';
import { BackgroundSlider } from './components/BackgroundSlider';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdateNotifier } from './components/UpdateNotifier';
import { DivinoMordomo } from './components/DivinoMordomo';
import { OnboardingGuide, shouldShowOnboarding } from './components/OnboardingGuide';
import { ConnectedKingMascot } from './components/ConnectedKingMascot';
import { MusicProvider } from './lib/connected-music/context';
import { presenceEngine } from './lib/presence/presence';
import { startReactor } from './lib/connected-reactor';
import { startEdge } from './lib/connected-edge';
import { CallModal, IncomingCallListener } from './components/CallModal';
import { ChatModal } from './components/ChatModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ConnectedLogo } from './components/ConnectedLogo';
import { DayNightAmbience } from './components/DayNightAmbience';
import { playSound } from './lib/sound-engine';
import { DOMAINS } from './lib/domain-config';
import { startCloudCore } from './lib/engines';
import { awardPoints } from './lib/economy/engine';

const FeedPage = lazy(() => import('./pages/FeedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const AiInsightsPage = lazy(() => import('./pages/AiInsightsPage'));
const NetworkPage = lazy(() => import('./pages/NetworkPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ConnectTvPage = lazy(() => import('./pages/ConnectTvPage'));
const MusicPage = lazy(() => import('./pages/MusicPage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const BusinessPage = lazy(() => import('./pages/BusinessPage'));
const CloudStatusPage = lazy(() => import('./pages/CloudStatusPage'));
const CloudControlCenter = lazy(() => import('./pages/CloudControlCenter'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
import DivinoOnboarding from "./components/DivinoOnboarding";
import { getDivinoOnboarding } from "./lib/divino/onboarding";

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <ConnectedLogo className="h-8 w-8" breathing />
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLinkText, setCopiedLinkText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<{ users: any[]; companies: any[]; posts: any[] } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [reportModal, setReportModal] = useState<{ type: 'post' | 'user'; targetId: string; authorName?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [incomingCallAccepted, setIncomingCallAccepted] = useState(false);
  const lastNotifIdRef = useRef<string>('');
  const APP_BASE = DOMAINS.OFFICIAL_URL.replace(/\/+$/, '');

  const handleIncomingCall = useCallback((call: any) => {
    setIncomingCall(call);
    setIncomingCallAccepted(false);
    playSound('call');
  }, []);

  useEffect(() => {
    const stop = startCloudCore();
    return stop;
  }, []);

  // Onboarding cognitivo do DIVINO: só entra no app após concluir (ou se já tiver).
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      getDivinoOnboarding(user.uid)
        .then((s) => setOnboardingComplete(!!s.profile.completed))
        .catch(() => setOnboardingComplete(false));
    } else {
      setOnboardingComplete(null);
    }
  }, [isAuthenticated, user?.uid]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['feed', 'profile', 'overview', 'connections', 'ai', 'network', 'gallery', 'connect-tv', 'games', 'settings', 'empresas', 'cloud', 'cloud-control'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabSelect = (tabName: string) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false);
    const titles: Record<string, string> = {
      feed: 'Feed — Connected King',
      profile: 'Perfil — Connected King',
      overview: 'Dashboard — Connected King',
      connections: 'Rede de Conexões — Connected King',
      ai: 'DIVINO IA — Connected King',
      network: 'Networking — Connected King',
      gallery: 'Galeria & Direitos Autorais — Connected King',
      'connect-tv': 'Connect TV — Connected King',
      games: 'Games Online — Connected King',
      settings: 'Definições — Connected King',
      empresas: 'Empresas — Connected King',
    };
    document.title = titles[tabName] || 'Connected King 👑 — Rede Social & Ecossistema Digital';
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.warn(e);
    }
  };

  // Prémios base: login diário + perfil completo (o motor faz dedupe por ref).
  useEffect(() => {
    if (!user?.uid) return;
    awardPoints(user.uid, 'daily_login', { ref: `login_${new Date().toISOString().slice(0, 10)}` }).catch(() => {});
    const complete = profileData?.displayName && (profileData?.photoURL || profileData?.bio);
    if (complete) awardPoints(user.uid, 'complete_profile', { ref: 'profile_complete' }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
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
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [initialCompanyId, setInitialCompanyId] = useState<string | null>(null);  const [newMessage, setNewMessage] = useState('');
  const [tvChatMessages, setTvChatMessages] = useState<any[]>([]);
  const [newTvChatMessage, setNewTvChatMessage] = useState('');
  const [isSendingTvChat, setIsSendingTvChat] = useState(false);
  const lastTvChatTimeRef = React.useRef<number>(0);
  const lastQueueTimeRef = React.useRef<number>(0);

  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  const sendFriendRequest = async (toUserId: string, toName: string, toAvatar: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        fromName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        fromAvatar: profileData.photoURL || '',
        to: toUserId,
        toName,
        toAvatar,
        participants: [user.uid, toUserId],
        status: 'pending',
        createdAt: Date.now(),
      });
      await createNotification(toUserId, 'friend_request', 'enviou-te um pedido de amizade', profileData.displayName || user.email?.split('@')[0] || 'Unknown', profileData.photoURL, '?tab=connections');
    } catch (e) {
      console.error('Error sending friend request:', e);
      alert('Erro ao enviar pedido de amizade.');
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
    } catch (e) {
      console.error('Error accepting friend request:', e);
      alert('Erro ao aceitar pedido de amizade.');
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
    } catch (e) {
      console.error('Error rejecting friend request:', e);
    }
  };

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
    points: 0,
  });
  const [networkConnections, setNetworkConnections] = useState<Record<number, boolean>>({});

  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const toggleNetworkConnection = (id: number) => {
    setNetworkConnections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    initConnectedStorage();
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
              points: 0,
              createdAt: serverTimestamp(),
              displayName: currentUser.displayName || '',
            });
            setProfileData(prev => ({ ...prev, displayName: currentUser.displayName || '', points: 0 }));
          } else {
            const data = userSnap.data();
            const remoteVersion = data.sessionVersion || 0;
            const localVersion = getSessionVersion(currentUser.uid);
            if (remoteVersion > localVersion) {
              setSessionVersion(currentUser.uid, remoteVersion);
              await signOut(auth);
              alert('A tua sessão foi terminada por segurança. Inicia sessão novamente.');
              return;
            }
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
              points: data.points || 0,
            });
          }

          try {
            const dev = getDeviceInfo();
            const { isNewDevice } = await registerSession(currentUser.uid);
            if (isNewDevice) {
              await logSecurityEvent(currentUser.uid, 'NEW_DEVICE_LOGIN', `Novo dispositivo: ${dev.browser} ${dev.os} (${dev.isMobile ? 'telemóvel' : 'computador'})`);
              await createNotification(currentUser.uid, 'security', `Novo acesso a partir de ${dev.browser} (${dev.os})`, '🛡️ Connected King Segurança', '', '?tab=settings').catch(() => {});
            }
          } catch (e) {
            console.warn('Session registration skipped:', e);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      
      setIsAuthReady(true);
    });

    getRedirectResult(auth).catch(() => {});

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const beat = () => updateDoc(userRef, { lastActive: serverTimestamp() }).catch(() => {});
    beat();
    const id = setInterval(beat, 60000);
    const onVisible = () => { if (!document.hidden) beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const ratings = data.ratings || { totalScore: 0, count: 0, userRatings: {} };
        return {
          id: doc.id,
          ...data,
          averageRating: ratings.count > 0 ? (ratings.totalScore || 0) / ratings.count : 0,
          totalRatings: ratings.count || 0,
          currentUserRating: user ? (ratings.userRatings?.[user.uid] || 0) : 0,
          isLiked: user ? (data.userLikes || []).includes(user.uid) : false,
        };
      }).filter((p: any) => !blockedIds.includes(p.userId) && p.status !== 'deleted');
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
    return () => unsubscribe();
  }, [user, blockedIds]);

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
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => !blockedIds.includes(m.senderId) && !blockedIds.includes(m.receiverId));
      setMessages(msgs);
      msgs.forEach((m: any) => {
        if (m.receiverId === user.uid && !m.delivered) {
          updateDoc(doc(db, 'messages', m.id), { delivered: true }).catch(() => {});
        }
      });
    }, error => handleFirestoreError(error, OperationType.LIST, 'messages'));

    return () => {
      unsubP();
      unsubM();
    };
  }, [user, blockedIds]);

  useEffect(() => {
    if (!user) { setFriendRequests([]); return; }
    const fq = query(
      collection(db, 'friendRequests'),
      where('participants', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(fq, (snapshot) => {
      setFriendRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => console.error('Friend requests error:', error));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uq = query(collection(db, 'users'));
    const unsub = onSnapshot(uq, (snapshot) => {
      setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setFollowingIds([]);
      setBlockedIds([]);
      return;
    }
    const nq = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50));
    const unsubN = onSnapshot(nq, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const firstId = list[0]?.id || '';
      if (firstId && lastNotifIdRef.current && firstId !== lastNotifIdRef.current) {
        playSound('notification');
      }
      lastNotifIdRef.current = firstId;
      setNotifications(list);
    }, error => console.error('Notifications error:', error));

    const fq = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsubF = onSnapshot(fq, (snapshot) => {
      setFollowingIds(snapshot.docs.map(d => d.data().followingId));
    }, error => console.error('Follows error:', error));

    const bq = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
    const unsubB = onSnapshot(bq, (snapshot) => {
      setBlockedIds(snapshot.docs.map(d => d.data().blockedId));
    }, error => console.error('Blocks error:', error));

    return () => {
      unsubN();
      unsubF();
      unsubB();
    };
  }, [user]);

  const createNotification = async (toUserId: string, type: string, message: string, actorName: string, actorAvatar?: string, link?: string) => {
    if (!user || toUserId === user.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: toUserId,
        type,
        message,
        actorId: user.uid,
        actorName,
        actorAvatar: actorAvatar || '',
        link: link || '',
        read: false,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Error creating notification:', e);
    }
  };

  const handleFollow = async (targetId: string, targetName: string, targetAvatar?: string) => {
    if (!user || targetId === user.uid) return;
    const isFollowing = followingIds.includes(targetId);
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', `${user.uid}_${targetId}`));
      } else {
        await setDoc(doc(db, 'follows', `${user.uid}_${targetId}`), {
          followerId: user.uid,
          followingId: targetId,
          followerName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
          followerAvatar: profileData.photoURL || '',
          createdAt: Date.now(),
        });
        await createNotification(targetId, 'follow', 'começou a seguir-te', profileData.displayName || user.email?.split('@')[0] || 'Unknown', profileData.photoURL, `?tab=profile&user=${user.uid}`);
      }
    } catch (e) {
      console.error('Error following:', e);
      handleFirestoreError(e, isFollowing ? OperationType.DELETE : OperationType.CREATE, 'follows');
    }
  };

  const handleLikePost = async (post: any) => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    const isLiked = (post.userLikes || []).includes(user.uid);
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          userLikes: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          userLikes: arrayUnion(user.uid),
        });
        playSound('like');
        await createNotification(post.userId, 'like', `gostou da tua publicação`, profileData.displayName || user.email?.split('@')[0] || 'Unknown', profileData.photoURL, `?tab=feed&post=${post.id}`);
      }
    } catch (e) {
      console.error('Error liking post:', e);
      handleFirestoreError(e, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleBlockUser = async (targetId: string) => {
    if (!user || targetId === user.uid) return;
    try {
      await setDoc(doc(db, 'blocks', `${user.uid}_${targetId}`), {
        blockerId: user.uid,
        blockedId: targetId,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Error blocking:', e);
      handleFirestoreError(e, OperationType.CREATE, 'blocks');
    }
  };

  const handleUnblockUser = async (targetId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'blocks', `${user.uid}_${targetId}`));
    } catch (e) {
      console.error('Error unblocking:', e);
      handleFirestoreError(e, OperationType.DELETE, 'blocks');
    }
  };

  const runSearch = async (rawQuery: string) => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const userResults = allUsers
      .filter((u: any) => (u.displayName || u.email || '').toLowerCase().includes(q))
      .slice(0, 5);
    let companyResults: any[] = [];
    try {
      const snap = await getDocs(query(collection(db, 'companies'), limit(50)));
      companyResults = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => (c.name || '').toLowerCase().includes(q))
        .slice(0, 5);
    } catch (e) {
      console.error('Search companies error:', e);
    }
    const postResults = posts
      .filter((p: any) => (p.content || '').toLowerCase().includes(q))
      .slice(0, 5);
    setSearchResults({ users: userResults, companies: companyResults, posts: postResults });
  };

  const unreadMessages = (messages as any[]).filter((m) => m.receiverId === user?.uid && !m.read).length;

  const conversations = useMemo(() => {
    const byUser: Record<string, { other: any; last: any; unread: number; lastAt: number }> = {};
    (messages as any[]).forEach((m) => {
      const otherId = m.senderId === user?.uid ? m.receiverId : m.senderId;
      if (!otherId) return;
      const prev = byUser[otherId];
      const other = allUsers.find((u: any) => u.id === otherId) || { id: otherId, displayName: m.senderId === user?.uid ? m.receiverName : m.senderName, photoURL: m.senderId === user?.uid ? m.receiverAvatar : m.senderAvatar };
      const msg = { ...m, otherName: other.displayName || other.email?.split('@')[0] || 'Utilizador', otherAvatar: other.photoURL || '', otherId };
      if (!prev || (m.createdAt || 0) > (prev.lastAt || 0)) {
        byUser[otherId] = {
          other: msg,
          last: msg,
          unread: prev?.unread || 0,
          lastAt: m.createdAt || 0,
        };
      }
      if (prev) prev.unread = prev.unread || 0;
      if (m.receiverId === user?.uid && !m.read && otherId !== user?.uid) {
        if (prev) prev.unread += 1;
        else byUser[otherId].unread += 1;
      }
    });
    return Object.values(byUser).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [messages, allUsers, user?.uid]);

  const handleSubmitReport = async () => {
    if (!user || !reportModal || !reportReason.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        type: reportModal.type,
        targetId: reportModal.targetId,
        reason: reportReason.trim(),
        status: 'pending',
        createdAt: Date.now(),
      });
      logSecurityEvent(user.uid, 'REPORT_SUBMITTED', `${reportModal.type} ${reportModal.targetId}`);
      setReportModal(null);
      setReportReason('');
      alert('Denúncia enviada. A moderação da Connected King vai analisar.');
    } catch (e) {
      console.error('Error submitting report:', e);
      handleFirestoreError(e, OperationType.CREATE, 'reports');
    }
  };

  const markNotificationsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (e) {
      console.error('Error marking notifications read:', e);
    }
  };

  const verifyMfaCode = async () => {
    if (!mfaResolver || mfaCode.trim().length < 6) {
      setAuthError('Insere o código de 6 dígitos da aplicação autenticadora.');
      return;
    }
    setIsVerifyingMfa(true);
    setAuthError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(mfaResolver.hints[0], mfaCode.trim());
      await mfaResolver.resolveSignIn(assertion);
      setMfaResolver(null);
      setMfaCode('');
    } catch (e: any) {
      console.error('MFA verification error:', e);
      if (e.code === 'auth/invalid-verification-code') {
        setAuthError('Código inválido. Verifica o código na aplicação autenticadora e tenta novamente.');
      } else {
        setAuthError('Falha na verificação em duas etapas. Tenta novamente.');
      }
    } finally {
      setIsVerifyingMfa(false);
    }
  };

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
      if (error.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(error.resolver as MultiFactorResolver);
        setMfaCode('');
        return;
      }
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
      const blob = await (await fetch(base64Image)).blob();
      const fileName = `${type}_${Date.now()}.jpg`;
      const ccsFile = new File([blob], fileName, { type: 'image/jpeg' });
      const folder = type === 'photoURL' ? 'avatar' : 'photos';
      const kind = type === 'photoURL' ? 'avatar' : 'cover';
      const { url } = await uploadToCcs({
        ownerUid: user.uid,
        ownerName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        file: ccsFile,
        folder,
        kind,
        visibility: 'public',
        user,
        profileData,
      });
      setProfileData(prev => ({ ...prev, [type]: url }));
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
        ratings: { totalScore: 0, count: 0, userRatings: {} },
        likes: 0,
        comments: 0,
        createdAt: Date.now()
      });
      setNewPostContent('');
      playSound('post');
    } catch (error) {
      console.error('Error publishing post:', error);
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      alert('Erro ao publicar o post.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleMediaPublish = async (file: File, onProgress?: (fraction: number) => void, options?: { forceKind?: 'reel' }): Promise<boolean> => {
    if (!user || !file) return false;
    setIsPosting(true);
    try {
      await publishMediaPost({
        user,
        profileData,
        file,
        content: newPostContent,
        onProgress,
        forceKind: options?.forceKind,
      });
      setNewPostContent('');
      playSound('post');
      return true;
    } catch (error: any) {
      console.error('Error publishing media post:', error);
      alert(error?.message || 'Erro ao publicar o conteúdo. O ficheiro não foi armazenado e a publicação não foi criada.');
      return false;
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
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        await updateDoc(postRef, { comments: increment(1) });
        await createNotification(postSnap.data().userId, 'comment', `comentou na tua publicação: "${content.trim().slice(0, 60)}"`, profileData.displayName || user.email?.split('@')[0] || 'Unknown', profileData.photoURL, `?tab=feed&post=${postId}`);
      }
    } catch (e) {
      console.error('Error adding comment:', e);
      handleFirestoreError(e, OperationType.CREATE, `posts/${postId}/comments`);
      alert('Erro ao adicionar comentário.');
    } finally {
      setIsCommenting({ ...isCommenting, [postId]: false });
    }
  };

  const handleRatePost = async (postId: string, score: number) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const data = postSnap.data();
      const ratings = data.ratings || { totalScore: 0, count: 0, userRatings: {} };
      const oldScore = ratings.userRatings?.[user.uid] || 0;
      const isNew = !ratings.userRatings?.[user.uid];

      const updateData: any = {
        [`ratings.userRatings.${user.uid}`]: score,
        'ratings.totalScore': (ratings.totalScore || 0) - oldScore + score,
      };
      if (isNew) {
        updateData['ratings.count'] = (ratings.count || 0) + 1;
      }
      await updateDoc(postRef, updateData);
      if (postSnap.data().userId !== user.uid) {
        await createNotification(postSnap.data().userId, 'rating', `avaliou a tua publicação com ${score}/10`, profileData.displayName || user.email?.split('@')[0] || 'Unknown', profileData.photoURL, `?tab=feed&post=${postId}`);
      }
    } catch (e) {
      console.error('Error rating post', e);
      handleFirestoreError(e, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleSharePost = async (post: any) => {
    const url = `${APP_BASE}/?post=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.content?.slice(0, 80), text: `Publicação de ${post.authorName} na Connected King`, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLinkText('Link da publicação copiado!');
      setTimeout(() => setCopiedLinkText(null), 3000);
    }
  };

  const [moreMenuPost, setMoreMenuPost] = useState<any>(null);

  const handleMoreOptions = (post: any) => {
    setMoreMenuPost(post);
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

  useEffect(() => {
    presenceEngine.start();
    return () => presenceEngine.stop();
  }, []);

  useEffect(() => {
    startReactor();
    startEdge();
  }, []);

  const handleLogin = async (providerName: 'google' | 'apple') => {
    if (isLoggingIn) return;
    setAuthError('');
    setIsLoggingIn(true);
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'apple') {
        provider = new OAuthProvider('apple.com');
      }
      
      if (provider) {
        provider.setCustomParameters({ prompt: 'select_account' });
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
          } else if (popupError.code === 'auth/cancelled-popup-request') {
            return;
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(error.resolver as MultiFactorResolver);
        setMfaCode('');
        setIsLoggingIn(false);
        return;
      }
      let msg = '';
      switch (error.code) {
        case 'auth/unauthorized-domain':
          msg = 'Domínio não autorizado. Adiciona este domínio no Firebase Console > Authentication > Authorized domains.';
          break;
        case 'auth/operation-not-allowed':
          msg = 'Provedor não ativado. Ativa no Firebase Console > Authentication > Sign-in method.';
          break;
        case 'auth/popup-blocked':
          msg = 'Popup bloqueado. Usa o login com Email ou clica "Modo Convidado".';
          break;
        case 'auth/popup-closed-by-user':
          setIsLoggingIn(false);
          return;
        case 'auth/credential-already-in-use':
          msg = 'Esta conta já está associada a outro método de login.';
          break;
        case 'auth/invalid-api-key':
          msg = 'API Key inválida. Verifica o ficheiro firebase-applet-config.json.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setIsLoggingIn(false);
          return;
        default:
          msg = `Erro (${error.code || 'desconhecido'}). Usa o Email ou Modo Convidado como alternativa.`;
      }
      setAuthError(msg);
      setShowEmailLogin(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallFeedback('Aplicativo instalado ✓');
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setInstallFeedback(null);
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstallFeedback('Aplicativo instalado ✓');
      }
      setInstallPrompt(null);
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setInstallFeedback(
        isIos
          ? 'No iPhone/iPad: Partilhar ⬆️ → "Adicionar ao Ecrã Início"'
          : 'Já instalado, ou instala pelo menu ⋮ → "Instalar aplicação"'
      );
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setIsAuthenticated(true);
    setUser({ uid: 'guest', displayName: 'Convidado', email: 'convidado@connected.local', isGuest: true });
    setProfileData(prev => ({
      ...prev,
      displayName: 'Convidado',
      photoURL: '',
      points: 0,
    }));
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#12100c]">
              <ConnectedLogo className="h-16 w-16" breathing enter />
              <span className="sr-only">Connected King</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <BackgroundSlider />
        <DayNightAmbience />
        <div className="flex h-screen w-full items-center justify-center p-4">
          <div className="glass-dark p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
            {/* Branding */}
            <div className="text-center space-y-3">
              <ConnectedKingMascot size={128} className="mx-auto" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight gold-text-gradient">Connected King</h1>
                <p className="flex items-center justify-center gap-2 text-amber-200/90 font-semibold tracking-wider text-base">
                  <span>Conecte.</span><span className="text-primary">·</span><span>Compartilhe.</span><span className="text-primary">·</span><span>Cresça.</span>
                </p>
              </div>
            </div>

            {/* Entrar / Criar Conta */}
            <div className="flex gap-3 pt-1">
              <Button
                size="lg"
                className="flex-1 h-12 rounded-2xl text-base font-bold shadow-lg shadow-amber-900/30"
                onClick={() => { setEmailMode('login'); setShowEmailLogin(true); setAuthError(''); }}
              >
                Entrar
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 rounded-2xl text-base font-bold bg-white/10 border-primary/25 text-white hover:bg-white/15"
                onClick={() => { setEmailMode('register'); setShowEmailLogin(true); setAuthError(''); }}
              >
                Criar Conta
              </Button>
            </div>

            {/* Auth Buttons */}
            <div className="w-full space-y-3 pt-2">
              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm p-3 rounded-xl flex items-start gap-2 text-left">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{authError}</p>
                </div>
              )}
              <Button
                variant="outline"
                size="lg"
                disabled={isLoggingIn}
                className="w-full text-sm h-12 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform bg-white/10 border-primary/25 text-white font-semibold hover:bg-white/15 disabled:opacity-60 disabled:hover:scale-100"
                onClick={() => handleLogin('google')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isLoggingIn ? 'A conectar ao Google...' : 'Entrar com a Conta Google'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                disabled={isLoggingIn}
                className="w-full text-sm h-12 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform bg-white/10 border-primary/25 text-white font-semibold hover:bg-white/15 disabled:opacity-60 disabled:hover:scale-100"
                onClick={() => handleLogin('apple')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.99-.79.9-2.07 1.6-3.18 1.51-.13-1.1.42-2.27 1.1-3.02C13.85 1.99 15.27 1.27 16.37 1.43zM20.5 17.2c-.55 1.27-.82 1.84-1.53 2.97-1.09 1.71-2.62 3.84-4.51 3.84-1.66 0-2.07-.99-4.29-.99-2.21 0-2.71.95-4.37.95-1.88 0-3.32-1.8-4.43-3.5-2.4-3.42-2.69-7.46-1.18-9.52 1.02-1.43 2.6-2.32 4.13-2.32 1.65 0 2.68.99 4.04.99 1.33 0 2.14-.99 4.06-.99 1.45 0 2.98.79 4.07 2.15-3.57 1.95-2.99 7.06.01 8.43z"/>
                </svg>
                {isLoggingIn ? 'A conectar à Apple...' : 'Entrar com a Apple'}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-slate-300 font-bold">Ou</span>
                </div>
              </div>

              {showEmailLogin ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  {mfaResolver ? (
                    <div className="space-y-3">
                      <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm p-3 rounded-xl flex items-start gap-2 text-left">
                        <ShieldAlert className="h-5 w-5 shrink-0" />
                        <p className="font-medium">Verificação em duas etapas ativada. Insere o código de 6 dígitos da tua aplicação autenticadora (Google Authenticator, Authy, etc.).</p>
                      </div>
                      {authError && (
                        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm p-3 rounded-xl flex items-start gap-2 text-left">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <p className="font-medium">{authError}</p>
                        </div>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Código de 6 dígitos"
                        className="w-full glass-input-dark rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/60 text-white font-bold tracking-[0.5em] text-center placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      />
                      <Button className="w-full rounded-xl shadow-md font-bold text-primary-foreground" onClick={verifyMfaCode} disabled={isVerifyingMfa || mfaCode.length < 6}>
                        {isVerifyingMfa ? 'A verificar...' : 'Verificar código'}
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-slate-300" onClick={() => { setMfaResolver(null); setMfaCode(''); setAuthError(''); }}>
                        Voltar
                      </Button>
                    </div>
                  ) : (
                  <>
                  {authError && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm p-3 rounded-xl flex items-start gap-2 text-left">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="font-medium">{authError}</p>
                    </div>
                  )}
                  <input
                    type="email"
                    placeholder="Seu email"
                    className="w-full glass-input-dark rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/60 text-white font-medium placeholder:text-slate-400 shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    className="w-full glass-input-dark rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/60 text-white font-medium placeholder:text-slate-400 shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-xl shadow-md font-bold text-primary-foreground" onClick={() => handleEmailAuth(emailMode === 'register')}>
                      {emailMode === 'register' ? 'Criar Conta' : 'Entrar'}
                    </Button>
                    <Button variant="secondary" className="flex-1 rounded-xl shadow-md font-bold" onClick={() => setEmailMode(emailMode === 'register' ? 'login' : 'register')}>
                      {emailMode === 'register' ? 'Já tenho conta' : 'Criar Conta'}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-slate-300" onClick={() => setShowEmailLogin(false)}>Voltar</Button>
                  </>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full text-sm h-11 rounded-xl shadow-sm hover:scale-[1.02] transition-transform bg-white/10 border-primary/25 text-white font-semibold hover:bg-white/15"
                  onClick={() => setShowEmailLogin(true)}
                >
                  <Mail className="mr-2 h-5 w-5 text-slate-300" />
                  Continuar com Email
                </Button>
              )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/15" />
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="bg-transparent px-2 text-slate-300 font-medium">OU EXPLORA SEM CONTA</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-9 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-medium border border-dashed border-primary/30"
                onClick={handleGuestLogin}
              >
                🧑‍💻 Modo Convidado (explorar sem login)
              </Button>
            </div>

            {/* Baixar Aplicativo */}
            <Button
              variant="outline"
              size="lg"
              onClick={handleInstallClick}
              className="w-full text-sm h-12 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform bg-white/10 border-primary/25 text-white font-semibold hover:bg-white/15"
            >
              <Download className="mr-2 h-5 w-5 text-amber-300" />
              Baixar Aplicativo
            </Button>
            {installFeedback && (
              <p className="text-[11px] text-amber-200/90 text-center -mt-1">{installFeedback}</p>
            )}

            {/* Custom Domain Option */}
            <div className="pt-3 border-t border-white/15 text-center">
              <p className="text-[10px] font-bold text-amber-400">🛠️ Usar Domínio Próprio</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Podes apontar o teu CNAME para a Connected King e usar o teu próprio domínio.
              </p>
            </div>

            {/* Legal */}
            <p className="text-xs text-slate-300 font-medium text-center">
              Ao continuar, concordas com os nossos Termos de Serviço.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Onboarding cognitivo — o utilizador não entra diretamente no Feed na 1ª vez.
  if (isAuthenticated && user?.uid && onboardingComplete === false) {
    return (
      <div className="min-h-screen w-full grid place-items-center bg-[#0b0f1a] p-4">
        <DivinoOnboarding uid={user.uid} onComplete={() => setOnboardingComplete(true)} />
      </div>
    );
  }

  return (
    <MusicProvider>
      <BackgroundSlider />
      <DayNightAmbience />
      <UpdateNotifier />
      <InstallPrompt />
      {isAuthenticated && (
        <IncomingCallListener user={user} onIncoming={handleIncomingCall} />
      )}
      {isAuthenticated && (
        <DivinoMordomo
          user={user}
          profileData={profileData}
          allUsers={allUsers}
          followingIds={followingIds}
          onNavigate={handleTabSelect}
          onCreatePost={() => handleTabSelect('feed')}
          handleFollow={handleFollow}
        />
      )}
      <BackgroundLayer />
      <div className="flex h-screen w-full text-slate-900 overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-col glass-dark border-r-0 transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 sm:flex shadow-xl ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-primary/15">
          <div className="flex items-center gap-3 font-bold text-white">
            <ConnectedLogo className="h-9 w-9" />
            <span className="text-2xl tracking-tight gold-text-gradient font-bold">Connected King</span>
          </div>
          <button className="sm:hidden text-slate-300" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-6">
          <nav className="grid items-start px-4 text-sm font-medium gap-2">
            <button 
              onClick={() => handleTabSelect('feed')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'feed' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Home className="h-5 w-5" />
              Feed Principal
            </button>
            <button 
              onClick={() => handleTabSelect('profile')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'profile' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <UserCircle className="h-5 w-5" />
              Meu Perfil
            </button>
            <button 
              onClick={() => handleTabSelect('overview')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'overview' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            <button 
              onClick={() => handleTabSelect('connections')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'connections' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <LinkIcon className="h-5 w-5" />
              Integrações
            </button>
            <button 
              onClick={() => handleTabSelect('ai')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'ai' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Sparkles className="h-5 w-5" />
              IA Insights
            </button>
            <button 
              onClick={() => handleTabSelect('network')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'network' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Users className="h-5 w-5" />
              Networking
            </button>
            <button 
              onClick={() => handleTabSelect('gallery')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'gallery' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Store className="h-5 w-5" />
              Galeria (Loja)
            </button>
            <button 
              onClick={() => handleTabSelect('connect-tv')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'connect-tv' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Tv className="h-5 w-5" />
              Connect TV
            </button>
            <button 
              onClick={() => handleTabSelect('music')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'music' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Music className="h-5 w-5" />
              Connected Music
            </button>
            <button 
              onClick={() => handleTabSelect('games')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'games' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Gamepad2 className="h-5 w-5" />
              Games Online
            </button>
            <button 
              onClick={() => handleTabSelect('empresas')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'empresas' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Building2 className="h-5 w-5" />
              Empresas
            </button>
            <button
              onClick={() => handleTabSelect('wallet')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'wallet' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Wallet className="h-5 w-5" />
              Carteira
            </button>
            <button
              onClick={() => handleTabSelect('cloud')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'cloud' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Cloud className="h-5 w-5" />
              Cloud
            </button>
            <button
              onClick={() => handleTabSelect('cloud-control')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'cloud-control' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Server className="h-5 w-5" />
              Control Center
            </button>
            <button 
              onClick={() => handleTabSelect('settings')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all font-semibold ${activeTab === 'settings' ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_18px_rgba(233,184,84,0.15)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Settings className="h-5 w-5" />
              Definições
            </button>
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card className="glass-dark border-primary/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-white">
                {(() => {
                  const pts = profileData.points || 0;
                  const level = pts >= 5000 ? 'Platina' : pts >= 1000 ? 'Ouro' : 'Prata';
                  return `Nível Criador: ${level}`;
                })()}
              </CardTitle>
              <CardDescription className="text-amber-100/80 font-medium">
                {(() => {
                  const pts = profileData.points || 0;
                  if (pts >= 5000) return 'Nível máximo atingido';
                  return `Faltam ${5000 - pts} pts para Platina`;
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Progress value={Math.min(((profileData.points || 0) / 5000) * 100, 100)} className="h-2 bg-white/10" />
            </CardContent>
          </Card>
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 mt-2 w-full text-slate-300 hover:bg-white/10 hover:text-rose-400 transition-all font-semibold text-sm">
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 sm:hidden glass-dark border-t border-primary/15 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-7">
          {[
            { id: 'feed', label: 'Feed', icon: Home },
            { id: 'network', label: 'Rede', icon: Users },
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'connect-tv', label: 'TV', icon: Tv },
            { id: 'cloud', label: 'Cloud', icon: Cloud },
            { id: 'cloud-control', label: 'CC', icon: Server },
            { id: 'profile', label: 'Perfil', icon: UserCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabSelect(id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold transition-all ${
                activeTab === id
                  ? 'text-primary drop-shadow-[0_0_8px_rgba(233,184,84,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
              {label}
              {activeTab === id && (
                <span className="w-4 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden relative z-0 w-full pb-14 sm:pb-0">
        <header className="flex h-16 items-center gap-4 border-b border-primary/15 glass-dark px-4 sm:px-6 justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 w-full flex-1">
            <button 
              className="sm:hidden p-2 -ml-2 text-slate-300 hover:bg-white/10 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <form className="flex-1 max-w-md" onSubmit={(e) => {
              e.preventDefault();
              runSearch(searchQuery);
            }}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Pesquisar pessoas, empresas, publicações..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) setSearchResults(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(searchQuery); }}
                  className="w-full appearance-none glass-input-dark shadow-none h-10 rounded-xl px-4 pl-10 py-2 text-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-white font-medium"
                />
              </div>
            </form>
            {searchResults && searchQuery.trim() && (
              <div className="absolute left-4 right-4 sm:left-6 sm:right-auto sm:w-96 top-16 z-50 glass-card border border-white/30 rounded-2xl shadow-xl p-3 max-h-[70vh] overflow-auto animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-sm font-bold text-slate-900">Resultados para "{searchQuery}"</h4>
                  <button className="text-slate-500 hover:text-slate-900" onClick={() => setSearchResults(null)}><X className="h-4 w-4" /></button>
                </div>
                {searchResults.users.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-1">Pessoas</p>
                    {searchResults.users.map((u: any) => (
                      <button key={u.id} className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white/60 transition-colors" onClick={() => { setSearchResults(null); setSearchQuery(''); setViewingUser(u.id); }}>
                        <Avatar className="h-8 w-8 border border-white/50 shrink-0">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback className="text-[10px]">{(u.displayName || u.email || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{u.displayName || u.email?.split('@')[0]}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.email || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.companies.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-1">Empresas</p>
                    {searchResults.companies.map((c: any) => (
                      <button key={c.id} className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white/60 transition-colors" onClick={() => { setSearchResults(null); setSearchQuery(''); setInitialCompanyId(c.id); handleTabSelect('empresas'); }}>
                        <Avatar className="h-8 w-8 border border-white/50 shrink-0 bg-white">
                          <AvatarImage src={c.logoUrl} />
                          <AvatarFallback className="text-[10px]">{(c.name || 'E')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{c.category} {c.verified ? '· ✓ Verificada' : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.posts.length > 0 && (
                  <div className="mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-1">Publicações</p>
                    {searchResults.posts.map((p: any) => (
                      <button key={p.id} className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-white/60 transition-colors" onClick={() => { setSearchResults(null); setSearchQuery(''); handleTabSelect('feed'); }}>
                        <Avatar className="h-8 w-8 border border-white/50 shrink-0">
                          <AvatarImage src={p.authorAvatar} />
                          <AvatarFallback className="text-[10px]">{(p.authorName || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-900 line-clamp-1">{p.content || (p.media?.type === 'video' ? '🎬 Vídeo' : '📷 Foto')}</p>
                          <p className="text-[10px] text-slate-500 truncate">{p.authorName} · {new Date(p.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.users.length === 0 && searchResults.companies.length === 0 && searchResults.posts.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Sem resultados para "{searchQuery}"</p>
                )}
              </div>
            )}
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
            <div className="relative">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl glass-input-dark border-primary/20 text-slate-200 hover:text-white shadow-sm relative" onClick={() => setShowMessagesPanel(!showMessagesPanel)}>
                <MessageCircle className="h-5 w-5" />
                <span className="sr-only">Mensagens</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold border-2 border-[#1a140c] shadow">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Button>
              {showMessagesPanel && (
                <div className="absolute right-0 top-12 w-80 glass-card border border-white/30 rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 z-50 max-h-[70vh] overflow-auto">
                  <h4 className="text-sm font-bold text-slate-900 mb-2 px-1">Mensagens</h4>
                  {conversations.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Sem conversas ainda</p>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((c) => (
                        <button
                          key={c.otherId}
                          onClick={() => {
                            setShowMessagesPanel(false);
                            setChattingWith(c.other);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white/60 transition-colors ${c.unread > 0 ? 'bg-white/40' : ''}`}
                        >
                          <Avatar className="h-9 w-9 border border-white/50 shrink-0">
                            <AvatarImage src={c.last.otherAvatar} />
                            <AvatarFallback className="text-[10px]">{(c.last.otherName || 'U')[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{c.last.otherName}</p>
                              <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                                {new Date(c.lastAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-slate-600 truncate">{c.last.content || (c.last.type === 'image' ? '📷 Foto' : c.last.type === 'video' ? '🎬 Vídeo' : '📎 Ficheiro')}</p>
                              {c.unread > 0 && <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-xs text-slate-600 mt-1" onClick={() => setShowMessagesPanel(false)}>Fechar</Button>
                </div>
              )}
            </div>
            <div className="relative">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl glass-input-dark border-primary/20 text-slate-200 hover:text-white shadow-sm relative" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markNotificationsRead(); }}>
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notificações</span>
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white shadow">
                    {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 glass-card border border-white/30 rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 z-50 max-h-[70vh] overflow-auto">
                  <h4 className="text-sm font-bold text-slate-900 mb-2 px-1">Notificações</h4>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Nenhuma notificação nova</p>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (n.link) {
                              const params = new URLSearchParams(n.link.replace('?', ''));
                              const tab = params.get('tab');
                              if (tab) handleTabSelect(tab);
                            }
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-white/60 transition-colors ${!n.read ? 'bg-white/40' : ''}`}
                        >
                          <Avatar className="h-8 w-8 border border-white/50 shrink-0">
                            <AvatarImage src={n.actorAvatar} />
                            <AvatarFallback className="text-[10px]">{n.actorName?.[0] || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 leading-snug">
                              <b className="text-slate-900">{n.actorName}</b> {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-xs text-slate-600 mt-1" onClick={() => setShowNotifications(false)}>Fechar</Button>
                </div>
              )}
            </div>
            <Avatar className="h-10 w-10 border border-primary/30 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => handleTabSelect('profile')}>
              <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {user && !user.emailVerified && (
          <div className="bg-amber-500/90 text-white px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Verifica o teu e-mail para proteger a conta e desbloquear todas as funcionalidades.</span>
            </div>
            <button
              className="ml-auto shrink-0 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1 font-bold transition-colors"
              onClick={async () => {
                try {
                  await sendEmailVerification(user);
                  alert('E-mail de verificação enviado! Verifica a tua caixa de entrada.');
                } catch {
                  alert('Não foi possível enviar o e-mail de verificação. Tenta novamente mais tarde.');
                }
              }}
            >
              Reenviar verificação
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'feed' && (
              <FeedPage
                user={user}
                profileData={profileData}
                posts={posts}
                allUsers={allUsers}
                newPostContent={newPostContent}
                setNewPostContent={setNewPostContent}
                isPosting={isPosting}
                handlePublish={handlePublish}
                handleMediaPublish={handleMediaPublish}
                onOpenProfile={(userId: string) => setViewingUser(userId)}
                handleRatePost={handleRatePost}
                handleLikePost={handleLikePost}
                handleSharePost={handleSharePost}
                handleMoreOptions={handleMoreOptions}
                followingIds={followingIds}
                toggleComments={toggleComments}
                expandedComments={expandedComments}
                postComments={postComments}
                commentInputs={commentInputs}
                setCommentInputs={setCommentInputs}
                handleAddComment={handleAddComment}
                isCommenting={isCommenting}
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
              <DashboardPage user={user} posts={posts} />
            )}
            {activeTab === 'connections' && (
              <ConnectionsPage
                user={user}
                profileData={profileData}
                allUsers={allUsers}
                friendRequests={friendRequests}
                sendFriendRequest={sendFriendRequest}
                acceptFriendRequest={acceptFriendRequest}
                rejectFriendRequest={rejectFriendRequest}
                followingIds={followingIds}
                handleFollow={handleFollow}
                onOpenProfile={(id: string) => setViewingUser(id)}
              />
            )}
            {activeTab === 'ai' && (
              <AiInsightsPage
                user={user}
                allUsers={allUsers}
                posts={posts}
                messages={messages}
              />
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
            {activeTab === 'music' && (
              <MusicPage
                user={user}
                profileData={profileData}
                allUsers={allUsers}
                onOpenProfile={(id: string) => setViewingUser(id)}
              />
            )}
            {activeTab === 'games' && (
              <GamesPage user={user} profileData={profileData} onOpenProfile={(id: string) => setViewingUser(id)} />
            )}
            {activeTab === 'empresas' && (
              <CompaniesPage user={user} profileData={profileData} initialCompanyId={initialCompanyId} onConsumedInitial={() => setInitialCompanyId(null)} />
            )}
            {activeTab === 'business' && (
              <BusinessPage user={user} profileData={profileData} />
            )}
{activeTab === 'cloud' && (
  <CloudStatusPage />
)}
{activeTab === 'cloud-control' && (
  <Suspense fallback={<div className="p-8 text-center text-slate-400">A carregar Control Center…</div>}>
    <CloudControlCenter />
  </Suspense>
)}
            {activeTab === 'settings' && (
              <SettingsPage
                user={user}
                profileData={profileData}
                toggleConnection={toggleConnection}
              />
            )}
            {activeTab === 'wallet' && (
              <WalletPage
                user={user}
                profileData={profileData}
              />
            )}
          </Suspense>
          </ErrorBoundary>
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
                  <CardTitle className="text-lg font-bold text-slate-900">Link Oficial da Rede Connected King</CardTitle>
                  <CardDescription className="text-xs text-slate-600 font-medium">Usa estes links para aceder ou convidar outros utilizadores.</CardDescription>
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
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Domínio Principal (Connected King):
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={DOMAINS.OFFICIAL_URL}
                    className="flex-1 bg-white/80 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-semibold selection:bg-primary/20"
                  />
                  <Button
                    size="sm"
                    className="rounded-xl text-xs font-bold shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(DOMAINS.OFFICIAL_URL);
                      setCopiedLinkText('Link copiado com sucesso!');
                      setTimeout(() => setCopiedLinkText(null), 3000);
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                  Link Curto (Connected King):
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={DOMAINS.OFFICIAL_URL}
                    className="flex-1 bg-white/80 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-semibold selection:bg-primary/20"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold shrink-0 border-slate-300 bg-white/90"
                    onClick={() => {
                      navigator.clipboard.writeText(DOMAINS.OFFICIAL_URL);
                      setCopiedLinkText('Link curto copiado!');
                      setTimeout(() => setCopiedLinkText(null), 3000);
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500">Usa o domínio <b>www.connected.org-github.io</b> ou aponta o teu próprio CNAME.</p>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-xs font-bold text-slate-700 block mb-2">Atalhos para Módulos Específicos:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: '📺 Connect TV', tab: 'connect-tv' },
                    { label: '🤝 Networking', tab: 'network' },
                    { label: '🛍️ Galeria', tab: 'gallery' },
                    { label: '💬 Feed Social', tab: 'feed' },
                  ].map(({ label, tab }) => (
                    <button
                      key={tab}
                      onClick={() => {
                        navigator.clipboard.writeText(`${APP_BASE}/?tab=${tab}`);
                        setCopiedLinkText(`Link de ${label.replace(/^.{2}/, '')} copiado!`);
                        setTimeout(() => setCopiedLinkText(null), 3000);
                      }}
                      className="p-2 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-left font-semibold text-slate-800 flex items-center justify-between"
                    >
                      <span>{label}</span>
                      <span className="text-[10px] text-primary">Copiar</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">Identidade Corporativa:</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/60 hover:bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 px-3 py-2 flex items-center gap-2 overflow-hidden">
                    <Github className="h-4 w-4 text-slate-700 shrink-0" />
                    <span className="truncate">{`github.com/enterprises/connectednetworking`}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("https://github.com/enterprises/connectednetworking");
                      setCopiedLinkText('Link do GitHub Enterprise copiado!');
                      setTimeout(() => setCopiedLinkText(null), 3000);
                    }}
                    className="p-2 bg-white/70 hover:bg-white rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
                    title="Copiar link do GitHub Enterprise"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">Empresa Connected King — código e ecossistema em github.com/enterprises/connectednetworking</p>
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

      {moreMenuPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMoreMenuPost(null)}>
          <Card className="w-full max-w-sm glass-card border-white/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/50">
                  <AvatarImage src={moreMenuPost.authorAvatar} />
                  <AvatarFallback>{moreMenuPost.authorName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Publicação de {moreMenuPost.authorName}</CardTitle>
                  <CardDescription className="text-xs text-slate-600 font-medium">Opções da publicação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-slate-800 hover:bg-white/60 font-semibold text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${APP_BASE}/?post=${moreMenuPost.id}`);
                  setCopiedLinkText('Link da publicação copiado!');
                  setTimeout(() => setCopiedLinkText(null), 3000);
                  setMoreMenuPost(null);
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2 text-primary" /> Copiar Link
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-slate-800 hover:bg-white/60 font-semibold text-sm"
                onClick={() => {
                  setReportModal({ type: 'post', targetId: moreMenuPost.id, authorName: moreMenuPost.authorName });
                  setMoreMenuPost(null);
                }}
              >
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" /> Denunciar Publicação
              </Button>
              {user && moreMenuPost.userId !== user.uid && (
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-sm"
                  onClick={() => {
                    handleBlockUser(moreMenuPost.userId);
                    setMoreMenuPost(null);
                    alert(`Utilizador ${moreMenuPost.authorName} bloqueado.`);
                  }}
                >
                  <X className="h-4 w-4 mr-2" /> Bloquear {moreMenuPost.authorName}
                </Button>
              )}
            </CardContent>
            <CardFooter className="p-3 pt-0">
              <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => setMoreMenuPost(null)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {incomingCall && !incomingCallAccepted && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm glass-card border-white/40 shadow-2xl overflow-hidden text-center animate-in zoom-in-95">
            <CardHeader className="pb-2 pt-8">
              <div className="flex justify-center mb-3">
                <div className="rounded-full p-1 bg-gradient-to-tr from-cyan-400 to-primary">
                  <Avatar className="h-20 w-20 border-2 border-white shadow-xl">
                    <AvatarImage src={incomingCall.callerAvatar} />
                    <AvatarFallback className="text-2xl">{incomingCall.callerName?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">{incomingCall.callerName || 'Utilizador'}</CardTitle>
              <CardDescription className="text-sm text-slate-600 font-medium flex items-center justify-center gap-2 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {incomingCall.type === 'voice' ? 'Chamada de voz recebida' : 'Chamada de vídeo recebida'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <p className="text-xs text-slate-500 font-medium mb-6">Custo: 10 pontos · Facturado ao minuto · {incomingCall.type === 'voice' ? '🎙️ Voz' : '📹 Vídeo'}</p>
              <div className="flex justify-center gap-6">
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' }).catch(() => {});
                    setIncomingCall(null);
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                    <PhoneOff className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-bold text-slate-700">Recusar</span>
                </button>
                <button
                  onClick={() => setIncomingCallAccepted(true)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg animate-pulse transition-transform group-hover:scale-110">
                    <Phone className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-bold text-slate-700">Atender</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {incomingCallAccepted && incomingCall && (
        <CallModal
          user={user}
          targetUser={{ id: incomingCall.callerId, displayName: incomingCall.callerName, photoURL: incomingCall.callerAvatar }}
          onClose={() => { setIncomingCall(null); setIncomingCallAccepted(false); }}
          role="callee"
          incomingCallId={incomingCall.id}
          initialType={incomingCall.type || 'video'}
        />
      )}

      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setReportModal(null)}>
          <Card className="w-full max-w-md glass-card border-white/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 shadow-sm">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Denunciar {reportModal.type === 'post' ? 'Publicação' : 'Utilizador'}</CardTitle>
                  <CardDescription className="text-xs text-slate-600 font-medium">
                    {reportModal.authorName ? `Conteúdo de ${reportModal.authorName}` : 'Ajuda-nos a manter a Connected King segura'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Descreve o motivo da denúncia (conteúdo impróprio, assédio, spam...)"
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-slate-900"
              />
                <p className="text-[10px] text-slate-500 font-medium">A denúncia é anónima para o denunciado e analisada pela moderação da Connected King.</p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs text-slate-600" onClick={() => { setReportModal(null); setReportReason(''); }}>Cancelar</Button>
              <Button size="sm" className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white" disabled={!reportReason.trim()} onClick={handleSubmitReport}>
                Enviar Denúncia
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      {chattingWith && activeTab !== 'network' && (
        <ChatModal user={user} profileData={profileData} chatUser={chattingWith} onClose={() => setChattingWith(null)} />
      )}

      {viewingUser && (
        <UserProfileModal
          userId={viewingUser}
          onClose={() => setViewingUser(null)}
          onMessage={() => { const u = allUsers.find((x: any) => x.id === viewingUser); if (u) { setChattingWith({ id: u.id, displayName: u.displayName, photoURL: u.photoURL }); } setViewingUser(null); }}
          followingIds={followingIds}
          handleFollow={handleFollow}
          sendFriendRequest={sendFriendRequest}
        />
      )}

      {isAuthenticated && shouldShowOnboarding() && (
        <OnboardingGuide onClose={() => {}} />
      )}
    </MusicProvider>
  );
}
