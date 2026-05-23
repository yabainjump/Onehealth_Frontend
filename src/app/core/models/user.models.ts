export interface PublicUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  institution: string;
  typeMedecin: string;
  country: string;
  city: string;
  phone: string;
  bio: string;
  photoURL: string;
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  role: 'user' | 'admin';
  isOnline?: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  typeMedecin?: string;
  country?: string;
  city?: string;
  phone?: string;
  bio?: string;
  photoURL?: string;
  coverPhotoURL?: string;
}

