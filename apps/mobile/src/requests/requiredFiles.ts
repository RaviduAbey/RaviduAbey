import type { DocumentKind, RequestType } from '@tourist/core';

export function requiredFiles(type: RequestType, hasIdp: boolean): DocumentKind[] {
  if (type === 'eta_application') return ['passport'];
  return hasIdp ? ['licence_front', 'licence_back', 'photo', 'idp'] : ['licence_front', 'licence_back', 'photo'];
}
