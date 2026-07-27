import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Tv, MessageSquare, Play, Send, X } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface ConnectTvPageProps {
  user: any;
  profileData: any;
  tvQueue: any[];
  newTvVideoUrl: string;
  setNewTvVideoUrl: (val: string) => void;
  isAddingToTv: boolean;
  showTvHelper: boolean;
  setShowTvHelper: (val: boolean) => void;
  handleAddToTvQueue: (videoUrl: string) => void;
  tvChatMessages: any[];
  newTvChatMessage: string;
  setNewTvChatMessage: (val: string) => void;
  handleSendTvChatMessage: () => void;
  isSendingTvChat: boolean;
}

const ConnectTvPage: React.FC<ConnectTvPageProps> = ({
  user,
  profileData,
  tvQueue,
  newTvVideoUrl,
  setNewTvVideoUrl,
  isAddingToTv,
  showTvHelper,
  setShowTvHelper,
  handleAddToTvQueue,
  tvChatMessages,
  newTvChatMessage,
  setNewTvChatMessage,
  handleSendTvChatMessage,
  isSendingTvChat,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" /> Connect TV
          </h2>
          <p className="text-slate-700 font-medium text-base">A nossa Jukebox de Vídeos. Assista ao vivo e envie os seus vídeos para a fila!</p>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Link do YouTube..."
              className="w-full glass-input border-white/50 bg-white/40 text-sm font-medium px-4 py-2 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
              value={newTvVideoUrl}
              onChange={(e) => setNewTvVideoUrl(e.target.value)}
              onFocus={() => setShowTvHelper(true)}
              disabled={isAddingToTv}
            />
            {showTvHelper && (
              <div className="absolute right-0 top-12 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95">
                <p className="text-xs text-slate-600 mb-2 font-medium">Cole um link do YouTube para enviar para a TV.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowTvHelper(false)} className="h-7 text-xs">Cancelar</Button>
                  <Button size="sm" onClick={() => handleAddToTvQueue(newTvVideoUrl)} disabled={!newTvVideoUrl || isAddingToTv} className="h-7 text-xs px-3 rounded-lg shadow-sm">Enviar para a Fila</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Player */}
        <div className="flex-1 glass-card border-white/30 shadow-xl rounded-2xl overflow-hidden relative min-h-[400px] xl:min-h-[500px] flex items-center justify-center bg-black">
          {tvQueue.filter((v: any) => v.status === 'playing').length > 0 ? (
            (() => {
              const playingVideo = tvQueue.find((v: any) => v.status === 'playing');
              return (
                <div className="w-full h-full flex flex-col relative group">
                  {playingVideo.videoUrl.includes('youtube') ? (
                    <iframe
                      src={playingVideo.videoUrl}
                      className="absolute inset-0 w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <img src={playingVideo.thumbnailUrl} alt="TV Background" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <span className="inline-flex items-center rounded-full border border-rose-500/50 px-3 py-1 text-xs font-bold transition-colors bg-rose-500/80 text-white shadow-lg backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span> AO VIVO
                    </span>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] bg-black/50 border-white/20 text-white hover:bg-black/70 px-2" onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'tv_queue', playingVideo.id), { status: 'played' });
                        const pendingVideos = tvQueue.filter((v: any) => v.status === 'pending');
                        if (pendingVideos.length > 0) {
                          await updateDoc(doc(db, 'tv_queue', pendingVideos[0].id), { status: 'playing' });
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}>
                      Passar Próximo
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                        <AvatarImage src={playingVideo.authorAvatar} />
                        <AvatarFallback>{playingVideo.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white drop-shadow-md">{playingVideo.title}</h3>
                        <p className="text-sm text-white/80 font-medium">Enviado por {playingVideo.authorName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="w-full h-full flex flex-col relative group">
              <iframe
                src={`https://www.youtube.com/embed/videoseries?list=PLybg94GvOJ9Go26S6p9aItUq-aLItKx48&autoplay=1&mute=1&loop=1&controls=0`}
                className="absolute inset-0 w-full h-full border-none pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>

              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="inline-flex items-center rounded-full border border-primary/50 px-3 py-1 text-xs font-bold transition-colors bg-primary/80 text-white shadow-lg backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span> TRANSMISSÃO CONTÍNUA
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex-1 w-full flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/50">
                    <Tv className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-white mb-0.5">Connect TV Classics</h3>
                    <p className="text-xs text-white/80 font-medium">Os melhores vídeos da internet, a tocar 24/7. Sempre Online.</p>
                  </div>
                  <Button onClick={() => setShowTvHelper(true)} size="sm" className="shrink-0 rounded-xl px-4 font-bold shadow-lg bg-primary hover:bg-primary/90 text-white hidden sm:flex">
                    Coloca o teu Vídeo
                  </Button>
                </div>
                <Button onClick={() => setShowTvHelper(true)} className="w-full sm:hidden rounded-xl font-bold shadow-lg bg-primary hover:bg-primary/90 text-white">
                  Coloca o teu Vídeo na TV
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-96 flex flex-col gap-4">
          <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
            <TabsList className="glass-input p-1 rounded-xl w-full grid grid-cols-2">
              <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Live Chat
              </TabsTrigger>
              <TabsTrigger value="queue" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700 flex items-center gap-2">
                <Play className="h-4 w-4" /> Fila ({tvQueue.filter((v: any) => v.status === 'pending').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
              <div className="bg-white/40 border border-white/40 rounded-2xl p-4 flex-1 h-[400px] flex flex-col shadow-sm">
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 flex flex-col-reverse">
                  {tvChatMessages.length > 0 ? (
                    tvChatMessages.map((msg: any) => (
                      <div key={msg.id} className="flex gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={msg.authorAvatar} />
                          <AvatarFallback>{msg.authorName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="bg-white/80 rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%] shadow-sm">
                          <span className="font-bold text-slate-900 mr-2 text-[11px]">{msg.authorName}</span>
                          <span className="text-slate-800 break-words">{msg.content}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-8">Sem mensagens ainda.</div>
                  )}
                </div>
                <div className="mt-3 flex gap-2 pt-3 border-t border-white/40">
                  <input
                    type="text"
                    placeholder="Comentar..."
                    className="flex-1 glass-input bg-white/50 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={newTvChatMessage}
                    onChange={(e) => setNewTvChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendTvChatMessage();
                    }}
                  />
                  <Button
                    onClick={handleSendTvChatMessage}
                    disabled={!newTvChatMessage.trim() || isSendingTvChat}
                    className="rounded-xl px-4 h-9"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="queue" className="flex-1 mt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200">
                {tvQueue.filter((v: any) => v.status === 'pending').length > 0 ? (
                  tvQueue.filter((v: any) => v.status === 'pending').map((item: any, idx: number) => (
                    <div key={item.id} className="flex gap-3 bg-white/60 hover:bg-white/80 p-3 rounded-xl border border-white/40 shadow-sm transition-all group">
                      <div className="relative h-16 w-24 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                        <img src={item.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-medium truncate mb-1">Por {item.authorName}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">#{idx + 1} na Fila</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white/30 rounded-2xl border border-white/40 border-dashed">
                    <p className="text-slate-500 font-medium text-sm">A fila está vazia.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export { ConnectTvPage };
export default ConnectTvPage;
