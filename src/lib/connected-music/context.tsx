import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { MusicTrack } from "../music";
import { MusicPlayerBar } from "../../components/MusicPlayerBar";

interface MusicContextValue {
  current: MusicTrack | null;
  user: any;
  play: (track: MusicTrack, user?: any) => void;
  setUser: (user: any) => void;
  close: () => void;
  // Política de áudio: pára a música quando outro áudio/video começa.
  requestAudioFocus: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic deve ser usado dentro de <MusicProvider>");
  return ctx;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MusicTrack | null>(null);
  const [user, setUser] = useState<any>(null);

  const play = useCallback((track: MusicTrack, u?: any) => {
    if (u !== undefined) setUser(u);
    setCurrent(track);
  }, []);

  const close = useCallback(() => setCurrent(null), []);

  const requestAudioFocus = useCallback(() => {
    window.dispatchEvent(new Event("ck:pause-music"));
  }, []);

  return (
    <MusicContext.Provider
      value={{ current, user, play, setUser, close, requestAudioFocus }}
    >
      {children}
      {/* Player global: permanece montado durante a navegação -> persistência */}
      <MusicPlayerBar track={current} user={user} onClose={close} />
    </MusicContext.Provider>
  );
}
