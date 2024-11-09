export function apiTypes(): string {
  return 'api-types';
}

export interface LoginRequest {
  username: string;
  password: string;
}
