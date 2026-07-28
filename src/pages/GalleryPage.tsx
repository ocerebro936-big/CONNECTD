import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tag, Tv, ShoppingCart, Sparkles, Crown, Shield, Camera } from 'lucide-react';
import { ThermalBadge } from '../components/ThermalBadge';
import { calculateTemperature } from '../lib/thermal-utils';
import { formatCurrency } from '../lib/currency-utils';
import { CheckoutModal } from '../components/CheckoutModal';

interface GalleryPageProps {
  user: any;
  purchases: any[];
  isPurchasing: boolean;
  handleBuyGalleryItem: (itemId: string, title: string, price: number) => void;
  handleAddToTvQueue: (videoUrl: string, title?: string) => void;
  handleComingSoon: () => void;
}

const hallOfFame = [
  { name: 'Nicola Tesla', role: 'Inventor & Visionário', type: 'Histórico', era: '1856–1943', bio: 'Pioneiro da eletricidade moderna, corrente alternada e tecnologia sem fios. O seu legado inspirou a Connected.', color: 'amber' },
  { name: 'Ada Lovelace', role: 'Primeira Programadora', type: 'Histórico', era: '1815–1852', bio: 'Criou o primeiro algoritmo destinado a ser processado por uma máquina. Mãe da computação.', color: 'amber' },
  { name: 'Alan Turing', role: 'Pai da IA', type: 'Histórico', era: '1912–1954', bio: 'Matemático e criptoanalista. A sua máquina de Turing é a base de toda a computação moderna.', color: 'amber' },
  { name: 'Génesis Wine', role: 'Fundador do Connected', type: 'Membro Lendário', era: 'Fundador', bio: 'Arquiteto do ecossistema e da infraestrutura de impacto social. Distintivo do Museu atribuído pelo DIVINO IA.', color: 'indigo' },
];

const copyrightMedia = [
  { id: 'cr-1', title: 'Fotografia Urbana 4K', author: '@criador_oficial', price: 15, points: 150, type: 'Foto RAW', resolution: '7680×4320' },
  { id: 'cr-2', title: 'Vídeo Drone Natureza', author: '@voo_livre', price: 25, points: 250, type: 'Vídeo 4K', resolution: '3840×2160' },
  { id: 'cr-3', title: 'Retrato Editorial HD', author: '@lente_mestre', price: 10, points: 100, type: 'Foto RAW', resolution: '6000×4000' },
  { id: 'cr-4', title: 'Reel Criativo 60fps', author: '@cine_connect', price: 20, points: 200, type: 'Vídeo 4K', resolution: '3840×2160' },
  { id: 'cr-5', title: 'Coleção de Texturas', author: '@design_code', price: 30, points: 300, type: 'Bundle', resolution: '8K' },
  { id: 'cr-6', title: 'Timelapse Urbano', author: '@cidade_em_movimento', price: 18, points: 180, type: 'Vídeo 4K', resolution: '3840×2160' },
];

const galleryItems = [1, 2, 3, 4, 5, 6, 7, 8];

const GalleryPage: React.FC<GalleryPageProps> = ({
  user,
  purchases,
  isPurchasing,
  handleBuyGalleryItem,
  handleAddToTvQueue,
  handleComingSoon,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gallery' | 'museum' | 'copyright'>('gallery');
  const [showCheckout, setShowCheckout] = useState(false);

  const handlePointsSuccess = (points: number) => {
    setShowCheckout(false);
    alert(`🎉 ${points} pontos adicionados à tua conta!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showCheckout && (
        <CheckoutModal onClose={() => setShowCheckout(false)} onSuccess={handlePointsSuccess} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Galeria & Centro Cultural</h2>
          <p className="text-slate-700 font-medium text-base">Explore, adquira e imortalize — o maior acervo digital da Connected.</p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-xl shadow-md gap-2 font-semibold bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowCheckout(true)}>
            <Sparkles className="h-4 w-4" /> Carregar Pontos
          </Button>
          <Button className="rounded-xl shadow-md gap-2 font-semibold" variant="outline" onClick={handleComingSoon}>
            <Camera className="h-4 w-4" /> Publicar Mídia
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm">
        {([
          { id: 'gallery' as const, label: '🖼️ Galeria', color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' },
          { id: 'museum' as const, label: '🏛️ Museu Dinâmico', color: 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' },
          { id: 'copyright' as const, label: '📜 Direitos Autorais', color: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === tab.id ? tab.color : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Fotos & Reels da Comunidade</h3>
              <p className="text-sm text-slate-600">Conteúdo visual publicado pelos criadores da Connected.</p>
            </div>
            <div className="flex gap-1 p-0.5 bg-white/60 rounded-lg border border-white/40">
              {['Em Destaque', 'Mais Recentes', 'Tendências'].map((f) => (
                <button key={f} className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-white/60 transition-all">
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {galleryItems.map((i) => (
              <Card key={i} className="glass-card border-white/30 shadow-md overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                <div className="relative h-48 w-full overflow-hidden">
                  <img src={`https://picsum.photos/seed/gallery${i}/600/400`} alt="Content" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-semibold">
                    {i % 3 === 0 ? '🎬 Reel 4K' : '📷 Foto RAW'}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 text-lg">Pacote Natureza {i}</h3>
                    <ThermalBadge temperature={calculateTemperature(i * 15, i * 5, i * 100)} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-4">Por @criador_{i}</p>
                  <div className="flex flex-col gap-2">
                    {i % 3 === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg shadow-sm font-semibold border-primary/20 text-primary hover:bg-primary/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToTvQueue(`https://picsum.photos/seed/gallery${i}/800/450`, `Pacote Natureza ${i} - @criador_${i}`);
                          alert('Adicionado à Connect TV!');
                        }}
                      >
                        <Tv className="h-4 w-4 mr-2"/> Enviar para TV
                      </Button>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xl text-emerald-600">{formatCurrency(15 * i, 'MZN')}</span>
                      {purchases.find((p: any) => p.itemId === `gallery-${i}`) ? (
                        <Button size="sm" variant="secondary" className="rounded-lg shadow-sm gap-2 font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200" disabled>
                          Comprado
                        </Button>
                      ) : (
                        <Button size="sm" className="rounded-lg shadow-sm gap-2 font-semibold" onClick={(e) => {
                          e.stopPropagation();
                          handleBuyGalleryItem(`gallery-${i}`, `Pacote Natureza ${i}`, 15 * i);
                        }} disabled={isPurchasing}>
                          <ShoppingCart className="h-4 w-4"/> Comprar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'museum' && (
        <div className="space-y-6">
          <div className="border-b border-amber-200/30 pb-4">
            <h3 className="text-xl font-bold text-amber-700 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Museu Dinâmico & Hall da Fama
            </h3>
            <p className="text-sm text-slate-600">
              Figuras históricas e os membros mais relevantes do Connected — imortalizados por elevado impacto social e Pontos de Impacto Social.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hallOfFame.map((person, i) => (
              <div key={i} className={`bg-gradient-to-br from-${person.color}-950/10 to-white/60 border border-${person.color}-300/40 rounded-2xl p-5 flex gap-4 shadow-md hover:shadow-lg transition-all`}>
                <div className={`w-16 h-16 rounded-full bg-${person.color}-100 border-2 border-${person.color}-400 flex-shrink-0 flex items-center justify-center text-${person.color}-600 font-bold text-xl`}>
                  👤
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-base">{person.name}</h4>
                    {person.type === 'Membro Lendário' && (
                      <span className="bg-amber-100 text-amber-700 border border-amber-400/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Distintivo do Museu
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{person.role} • {person.type} • {person.era}</p>
                  <p className="text-xs text-slate-700 pt-1 leading-relaxed">{person.bio}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200/40 rounded-2xl p-6 text-center">
            <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-900 text-lg">Tens o que é preciso para entrar no Hall da Fama?</h4>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Acumula Pontos de Impacto Social elevados e sê reconhecido pelo DIVINO IA. O teu perfil pode ser imortalizado no Museu Dinâmico para sempre.
            </p>
            <Button className="mt-4 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 shadow-md" onClick={handleComingSoon}>
              Saber Mais
            </Button>
          </div>
        </div>
      )}

      {activeSubTab === 'copyright' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-200/30 pb-4">
            <div>
              <h3 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-500" />
                Mercado de Direitos Autorais
              </h3>
              <p className="text-sm text-slate-600">
                Adquira licenças comerciais de fotos e vídeos em qualidade original HD/4K. Transferência automática de direitos.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl gap-2 font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={handleComingSoon}>
              <Tag className="h-4 w-4" /> Licenciar Meu Conteúdo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {copyrightMedia.map((item) => (
              <Card key={item.id} className="border-emerald-200/40 shadow-md hover:shadow-lg transition-all overflow-hidden group">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-xl relative flex items-center justify-center text-white/30 text-sm font-medium overflow-hidden">
                  <img src={`https://picsum.photos/seed/${item.id}/600/340`} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                  <span className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase shadow-md">
                    Licença Comercial
                  </span>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                    {item.resolution}
                  </span>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{item.author} • {item.type}</p>
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                    <div>
                      <span className="text-emerald-600 font-extrabold text-sm">{formatCurrency(item.price, 'MZN')}</span>
                      <span className="text-slate-400 text-xs ml-2">/ {item.points} pts</span>
                    </div>
                    <Button size="sm" className="rounded-lg text-xs font-bold px-4 bg-emerald-600 hover:bg-emerald-500 shadow-sm" onClick={() => {
                      handleBuyGalleryItem(item.id, item.title, item.price);
                    }} disabled={isPurchasing || !!purchases.find((p: any) => p.itemId === item.id)}>
                      {purchases.find((p: any) => p.itemId === item.id) ? 'Adquirido' : 'Comprar Licença'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { GalleryPage };
export default GalleryPage;
