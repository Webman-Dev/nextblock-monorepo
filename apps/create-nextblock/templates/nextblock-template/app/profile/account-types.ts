export interface ProfileAccountUser {
  id: string;
  email: string | undefined;
}

export interface ProfileAccountSummary {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
  github_username: string | null;
}
