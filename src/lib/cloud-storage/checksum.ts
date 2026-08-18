// ============================================================================
// Connected Cloud Core — Checksum (integridade client-side)
// ----------------------------------------------------------------------------
// SHA-256 do conteúdo para validar integridade no Upload Engine. Usa a Web
// Crypto API (nativa, sem downloads).
// ============================================================================
export async function fileChecksum(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
