import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Tag, Tv, ShoppingCart, Sparkles } from 'lucide-react';

interface GalleryPageProps {
  user: any;
  purchases: any[];
  isPurchasing: boolean;
  handleBuyGalleryItem: (itemId: string, title: string, price: number) => void;
  handleAddToTvQueue: (videoUrl: string, title?: string) => void;
  handleComingSoon: () => void;
}

const GalleryPage: React.FC<GalleryPageProps> = ({
  user,
  purchases,
  isPurchasing,
  handleBuyGalleryItem,
  handleAddToTvQueue,
  handleComingSoon,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Galeria & Museu</h2>
          <p className="text-slate-700 font-medium text-base">Compre, venda e explore os melhores conteúdos selecionados pela IA.</p>
        </div>
        <Button className="rounded-xl shadow-md gap-2 font-semibold" onClick={handleComingSoon}><Tag className="h-4 w-4" /> Vender Conteúdo</Button>
      </div>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="glass-input p-1 rounded-xl">
          <TabsTrigger value="marketplace" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700">Marketplace</TabsTrigger>
          <TabsTrigger value="museu" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700">Museu (Seleção IA)</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="glass-card border-white/30 shadow-md overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                <div className="relative h-48 w-full overflow-hidden">
                  <img src={`https://picsum.photos/seed/gallery${i}/600/400`} alt="Content" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-semibold">
                    {i % 3 === 0 ? 'Vídeo 4K' : 'Foto RAW'}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Pacote Natureza {i}</h3>
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
                      <span className="font-bold text-xl text-emerald-600">€ {15 * i},00</span>
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
        </TabsContent>

        <TabsContent value="museu" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={`museu-${i}`} className="glass-card border-amber-200/50 shadow-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 z-10"></div>
                <div className="relative h-64 w-full overflow-hidden">
                  <img src={`https://picsum.photos/seed/museu${i}/800/600`} alt="Content" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Escolha da IA</span>
                    </div>
                    <h3 className="font-bold text-xl mb-1">Obra Prima {i}</h3>
                    <p className="text-sm text-white/80 font-medium">Por @master_{i}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { GalleryPage };
export default GalleryPage;
