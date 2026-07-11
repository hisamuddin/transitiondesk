export type GoogleUser = {
  email: string;
  id?: string;
  isAdmin?: boolean;
  name: string;
  picture?: string;
  providerToken?: string;
  providerRefreshToken?: string;
  authProvider?: string;
};
