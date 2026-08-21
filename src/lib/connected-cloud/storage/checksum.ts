export async function calculateChecksum(
  data: Uint8Array,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    data,
  );

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
