import type { DocumentKind } from '@tourist/core';
import { randomUUID } from 'expo-crypto';
import { supabase } from '@/src/lib/supabase';

function extensionOf(uri: string, contentType: string): string {
  const fromType = contentType.split('/')[1];
  if (fromType && /^[a-z0-9]+$/.test(fromType)) return fromType === 'jpeg' ? 'jpg' : fromType;
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

/** Uploads a local image to <profileId>/<requestId>/<kind>-<uuid>.<ext> and returns that path. */
export async function uploadDocument(profileId: string, requestId: string, kind: DocumentKind, fileUri: string): Promise<string> {
  const res = await fetch(fileUri);
  const body = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const path = `${profileId}/${requestId}/${kind}-${randomUUID()}.${extensionOf(fileUri, contentType)}`;
  const { error } = await supabase.storage.from('documents').upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
