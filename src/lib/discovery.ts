// ============================================================================
// Connected Discovery Engine — visibilidade, recomendação e descoberta
// ----------------------------------------------------------------------------
// Tudo determinístico e baseado em dados reais dos utilizadores/posts. O
// objetivo: dar a todos uma chance real de serem descobertos (sem competição
// injusta de seguidores) e alimentar o feed, o DIVINO e o crescimento.
// ============================================================================

export function parseTags(tags: string | string[] | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// Qualidade do perfil (0–100)
export function profileCompleteness(p: any): number {
  let score = 0;
  if (p?.displayName) score += 20;
  if (p?.photoURL) score += 15;
  if (p?.bio && p.bio.length > 10) score += 20;
  const tags = parseTags(p?.tags);
  score += Math.min(tags.length * 8, 25);
  if (p?.country) score += 10;
  if (p?.coverURL) score += 10;
  return Math.min(score, 100);
}

// Connected Score — recompensa qualidade, não quantidade de seguidores.
export function visibilityScore(
  p: any,
  stats?: { posts?: number; followers?: number; interactions?: number }
): number {
  const completeness = profileCompleteness(p);
  const posts = stats?.posts ?? 0;
  const followers = stats?.followers ?? 0;
  const interactions = stats?.interactions ?? 0;
  const contentQuality = Math.min(posts * 6, 25);
  const legitInteraction = Math.min(interactions * 2, 20);
  // Contas pequenas recebem um pequeno impulso de descoberta (dar chance a todos)
  const discovery = followers < 200 ? 15 : followers < 2000 ? 8 : 4;
  return Math.min(
    Math.round(completeness * 0.4 + contentQuality + legitInteraction + discovery),
    100
  );
}

export function compatibility(a: any, b: any): { score: number; reasons: string[] } {
  const ta = parseTags(a?.tags);
  const tb = parseTags(b?.tags);
  const common = ta.filter((t) => tb.includes(t));
  let score = Math.min(common.length * 18, 55);
  const reasons: string[] = [];
  if (common.length) {
    reasons.push(`Interesses em comum: ${common.slice(0, 3).join(', ')}`);
  }
  if (a?.country && b?.country && a.country === b.country) {
    score += 20;
    reasons.push(`Mesma região (${a.country})`);
  }
  return { score: Math.min(score, 99), reasons };
}

export interface PersonRecommendation {
  user: any;
  score: number;
  reasons: string[];
}

export function peopleYouMayKnow(opts: {
  uid: string;
  viewerTags?: string[];
  viewerCountry?: string;
  followingIds: string[];
  allUsers: any[];
  limit?: number;
}): PersonRecommendation[] {
  const { uid, viewerTags, viewerCountry, followingIds, allUsers, limit = 8 } = opts;
  const following = new Set(followingIds);
  return allUsers
    .filter((u) => u.uid !== uid && !following.has(u.uid))
    .map((u) => {
      const c = compatibility({ tags: viewerTags, country: viewerCountry }, u);
      const fc = u.followerCount ?? u.followers ?? 0;
      if (fc < 50) c.score += 8; // dar uma chance a contas pouco conhecidas
      return { user: u, score: Math.min(c.score, 99), reasons: c.reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// 🌱 Novos Talentos — contas novas/pouco conhecidas para distribuição justa.
export function newTalents(opts: { allUsers: any[]; limit?: number }): any[] {
  const { allUsers, limit = 6 } = opts;
  return allUsers
    .filter((u) => (u.followerCount ?? u.followers ?? 0) < 100)
    .sort((a, b) => (a.followerCount ?? a.followers ?? 0) - (b.followerCount ?? b.followers ?? 0))
    .slice(0, limit);
}

export function trendingPosts(posts: any[], limit = 10): any[] {
  const now = Date.now();
  return [...posts]
    .map((p) => {
      const ageH = Math.max((now - (p.createdAt ?? now)) / 36e5, 1);
      const interactions =
        (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.views ?? 0) * 0.1;
      return { p, velocity: interactions / ageH };
    })
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, limit)
    .map((x) => x.p);
}

// Feed dinâmico: Seguindo + Interesses + Descoberta + Novos Talentos + Trending
export function buildFeed(opts: {
  followingIds: string[];
  posts: any[];
  allUsers: any[];
  viewerTags?: string[];
  limit?: number;
}): any[] {
  const { followingIds, posts, allUsers, viewerTags, limit = 50 } = opts;
  const following = new Set(followingIds);
  const tags = parseTags(viewerTags);
  const followerCountById = new Map(allUsers.map((u) => [u.uid, u.followerCount ?? u.followers ?? 0]));

  return posts
    .map((p) => {
      let score = 0;
      if (following.has(p.userId)) score += 40;
      if (
        tags.length &&
        ((p.tags && parseTags(p.tags).some((t) => tags.includes(t))) ||
          (p.content && tags.some((t) => p.content.toLowerCase().includes(t))))
      )
        score += 20;
      if ((followerCountById.get(p.userId) ?? 0) < 100) score += 10; // descoberta
      const ageH = Math.max((Date.now() - (p.createdAt ?? Date.now())) / 36e5, 1);
      const interactions = (p.likes ?? 0) + (p.comments ?? 0) + (p.views ?? 0) * 0.1;
      score += Math.min(interactions / ageH, 30);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}
