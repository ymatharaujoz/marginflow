export type AuthenticatedRequestContext = {
  session: {
    id: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
};
