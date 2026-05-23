import { PublicUser } from './user.models';

export interface PostComment {
  author: PublicUser | null;
  text: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: PublicUser | null;
  title: string;
  content: string;
  imageUrls: string[];
  likesCount: number;
  userHasLiked: boolean;
  comments: PostComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  imageUrls?: string[];
}

export interface AddCommentRequest {
  text: string;
}
