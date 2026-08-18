// Connected RUN: KINGDOM — NPCs vivos do Connected World.
export interface NpcDef {
  id: string;
  emoji: string;
  name: string;
  lines: string[];
}

export const NPCS: NpcDef[] = [
  { id: 'vendor', emoji: '👨', name: 'Vendedor', lines: ['Queres itens raros?', 'Troca coins por cosméticos!', 'A loja abre com a tua pontuação.'] },
  { id: 'artist', emoji: '👩', name: 'Artista', lines: ['Pinta o teu rasto!', 'Desbloqueia skins na loja.', 'A Connected é arte viva.'] },
  { id: 'runner', emoji: '🧑', name: 'Corredor', lines: ['Junta-te à corrida!', 'O Connected Mode é puro fogo.', 'Bate o teu recorde hoje.'] },
  { id: 'robot', emoji: '🤖', name: 'Robot', lines: ['A analisar o mundo...', 'Evento global detetado.', 'Divino está atento.'] },
  { id: 'guardian', emoji: '👮', name: 'Guardião', lines: ['Corre com respeito.', 'Anti-fraude ativo.', 'Mundo seguro para todos.'] },
  { id: 'king', emoji: '👑', name: 'King', lines: ['Bem-vindo ao Reino!', 'Tu ajudas a construir o mundo.', 'Corre pelo Connected King!'] },
];

export function randomNpcLine(): { npc: NpcDef; line: string } {
  const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
  const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
  return { npc, line };
}
