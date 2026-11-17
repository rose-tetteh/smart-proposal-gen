/**
 * Share links: the proposal is compressed into the URL itself (after the #),
 * so a read-only copy can be opened without a backend. Nothing is uploaded;
 * the fragment never leaves the browser in an HTTP request.
 * With a backend this becomes a short link to a stored, permissioned copy.
 */
import { USERS } from '@/data/company';
import type { Proposal } from '@/lib/types';

export interface SharedProposal {
  title: string;
  client: string;
  site: string;
  location: string;
  workType: string;
  industry: string;
  dueDate: string;
  owner: string;
  ownerTitle: string;
  sections: { title: string; body: string }[];
  sharedAt: string;
}

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function makeShareUrl(p: Proposal) {
  const owner = USERS.find((u) => u.id === p.owner);
  const payload: SharedProposal = {
    title: p.title,
    client: p.client,
    site: p.site,
    location: p.location,
    workType: p.workType,
    industry: p.industry,
    dueDate: p.dueDate,
    owner: owner?.name ?? '',
    ownerTitle: owner?.title ?? '',
    sections: p.sections.map((s) => ({ title: s.title, body: s.body })),
    sharedAt: new Date().toISOString(),
  };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  let data: string;
  if (typeof CompressionStream !== 'undefined') data = `z.${b64url(await pipe(raw, new CompressionStream('deflate-raw')))}`;
  else data = `u.${b64url(raw)}`;
  return `${location.origin}/share#${data}`;
}

export async function readShareHash(hash: string): Promise<SharedProposal | null> {
  try {
    const h = hash.replace(/^#/, '');
    const [kind, data] = [h.slice(0, 2), h.slice(2)];
    let bytes = fromB64url(data);
    if (kind === 'z.') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharedProposal;
  } catch {
    return null;
  }
}
