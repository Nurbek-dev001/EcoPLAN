export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface BlockchainEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  hash: string;
  previousHash: string;
  data: string;
}

export async function buildHashChain(entries: Array<{
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  data: string;
}>): Promise<BlockchainEntry[]> {
  const result: BlockchainEntry[] = [];
  let previousHash = "0".repeat(64);
  for (const entry of entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
    const payload = `${previousHash}|${entry.id}|${entry.timestamp}|${entry.user}|${entry.action}|${entry.data}`;
    const hash = await sha256(payload);
    result.push({
      ...entry,
      hash,
      previousHash,
    });
    previousHash = hash;
  }
  return result;
}
