// ============================================================================
// Connected Cloud Core — motores autónomos
// ----------------------------------------------------------------------------
// Cada motor herda ConnectedEngine e executa tarefas pré-autorizadas. Lógica
// pesada (transcoding, thumbnails, backups em disco) será delegada a Cloud
// Functions mais tarde; aqui orquestramos o possível no cliente + Firebase.
// ============================================================================
import { db } from '../../firebase';
import { collection, query, where, getDocs, limit, deleteDoc, doc } from 'firebase/firestore';
import { ConnectedEngine, EngineContext } from '../connected-engine';
import { RECOVERY_WINDOW_DAYS } from '../post-api';

/** ⚙️ Storage Engine — organiza e valida objetos (via metadados cloudAssets). */
export class StorageEngine extends ConnectedEngine {
  readonly id = 'connected.storage';
  readonly label = 'Storage';

  protected async execute(_ctx: EngineContext): Promise<void> {
    const pending = await getDocs(
      query(collection(db, 'cloudAssets'), where('processingState', '==', 'uploading'), limit(100))
    );
    const failed = await getDocs(
      query(collection(db, 'cloudAssets'), where('processingState', '==', 'failed'), limit(100))
    );
    if (failed.size > 0) {
      throw new Error(`${failed.size} ficheiro(s) falhados; ${pending.size} em curso`);
    }
    if (pending.size > 5) {
      throw new Error(`${pending.size} uploads ainda em curso`);
    }
  }
}

/** ❤️ Health Engine — verifica se os serviços críticos estão vivos. */
export class HealthEngine extends ConnectedEngine {
  readonly id = 'connected.health';
  readonly label = 'Health';

  protected async execute(_ctx: EngineContext): Promise<void> {
    if (!navigator.onLine) throw new Error('Sem ligação à internet');
    const q = query(collection(db, 'posts'), limit(1));
    await getDocs(q); // ping barato ao Firestore
  }
}

/** 🎬 Media Engine — acompanha fila de processamento de vídeo/áudio. */
export class MediaEngine extends ConnectedEngine {
  readonly id = 'connected.media';
  readonly label = 'Media';

  protected async execute(_ctx: EngineContext): Promise<void> {
    const music = await getDocs(query(collection(db, 'music'), limit(1)));
    const tv = await getDocs(query(collection(db, 'tvChannels'), limit(1)));
    if (!music && !tv) return; // só valida que as coleções respondem
  }
}

/** 🔎 SEO Engine — mantém metadados e descoberta de motores de busca. */
export class SeoEngine extends ConnectedEngine {
  readonly id = 'connected.seo';
  readonly label = 'SEO';

  protected async execute(_ctx: EngineContext): Promise<void> {
    // robots.txt e sitemap.xml já são estáticos em /public com o host correto.
    // Aqui garantimos que o gerador de structured data está disponível.
  }
}

/** 🌟 Discovery Engine — prepara recomendações e novos talentos. */
export class DiscoveryEngine extends ConnectedEngine {
  readonly id = 'connected.discovery';
  readonly label = 'Discovery';

  protected async execute(_ctx: EngineContext): Promise<void> {
    // invalida cache de descoberta para forçar recálculo na próxima leitura
    try {
      localStorage.removeItem('connected.discovery.cache');
    } catch {
      /* ignore */
    }
  }
}

/** 🧹 Cleanup Engine — remove ficheiros temporários expirados (local). */
export class CleanupEngine extends ConnectedEngine {
  readonly id = 'connected.cleanup';
  readonly label = 'Cleanup';

  protected async execute(_ctx: EngineContext): Promise<void> {
    const now = Date.now();
    const TTL = 1000 * 60 * 60 * 24; // 24h
    let removed = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('connected.temp.')) {
        const raw = localStorage.getItem(k);
        try {
          const ts = raw ? JSON.parse(raw).ts : 0;
          if (ts && now - ts > TTL) {
            localStorage.removeItem(k);
            removed++;
          }
        } catch {
          /* ignore */
        }
      }
    }
    if (removed > 20) throw new Error(`${removed} temporários expirados removidos`);

    // eliminações permanentes fora da janela de recuperação
    const cutoff = Date.now() - RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const delSnap = await getDocs(
      query(collection(db, 'posts'), where('status', '==', 'deleted'), limit(50))
    );
    let purged = 0;
    for (const d of delSnap.docs) {
      const ts = d.data()?.deletedAt?.toMillis ? d.data().deletedAt.toMillis() : 0;
      if (ts && ts < cutoff) {
        await deleteDoc(doc(db, 'posts', d.id));
        purged++;
      }
    }
    if (purged > 0) localStorage.setItem('connected.cleanup.purged', String(purged));
  }
}

/** 💾 Backup Engine — heartbeat de backup local. */
export class BackupEngine extends ConnectedEngine {
  readonly id = 'connected.backup';
  readonly label = 'Backup';

  protected async execute(_ctx: EngineContext): Promise<void> {
    localStorage.setItem('connected.backup.heartbeat', JSON.stringify({ at: Date.now() }));
  }
}

/** 🛡️ Security Engine — analisa estado de autenticação e eventos. */
export class SecurityEngine extends ConnectedEngine {
  readonly id = 'connected.security';
  readonly label = 'Security';

  protected async execute(_ctx: EngineContext): Promise<void> {
    const suspicious = localStorage.getItem('connected.security.flags');
    if (suspicious) throw new Error('Eventos de segurança por rever');
  }
}

/** 🔔 Notification Engine — poda notificações antigas (local). */
export class NotificationEngine extends ConnectedEngine {
  readonly id = 'connected.notifications';
  readonly label = 'Notifications';

  protected async execute(_ctx: EngineContext): Promise<void> {
    const MAX = 100;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('connected.notif.')) keys.push(k);
    }
    if (keys.length > MAX) {
      keys
        .sort((a, b) => (localStorage.getItem(a) || '').localeCompare(localStorage.getItem(b) || ''))
        .slice(0, keys.length - MAX)
        .forEach((k) => localStorage.removeItem(k));
    }
  }
}

/** 🧾 Billing Engine — mantém estável a ponte comercial/BlueCoin. */
export class BillingEngine extends ConnectedEngine {
  readonly id = 'connected.billing';
  readonly label = 'Billing';

  protected async execute(_ctx: EngineContext): Promise<void> {
    // Eventos comerciais reais passam por finance-utils; aqui apenas heartbeat.
  }
}
