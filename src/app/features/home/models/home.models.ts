export interface NewsItem {
  id: string;
  text: string;
  type: 'urgent' | 'info';
  timestamp: Date;
  isReport?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  photoUrl: string;
  score: number;
  rank: string;
}

export interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}
