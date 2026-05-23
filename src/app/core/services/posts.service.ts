import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AddCommentRequest,
  CreatePostRequest,
  FeedPost,
} from '../models/post.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly api = inject(ApiService);

  listPosts(authorId?: string): Observable<FeedPost[]> {
    if (authorId) {
      return this.api.get<FeedPost[]>(
        `/posts?authorId=${encodeURIComponent(authorId)}`,
      );
    }
    return this.api.get<FeedPost[]>('/posts');
  }

  createPost(payload: CreatePostRequest): Observable<FeedPost> {
    return this.api.post<FeedPost, CreatePostRequest>('/posts', payload);
  }

  likePost(postId: string): Observable<FeedPost> {
    return this.api.post<FeedPost, Record<string, never>>(
      `/posts/${postId}/like`,
      {},
    );
  }

  addComment(postId: string, payload: AddCommentRequest): Observable<FeedPost> {
    return this.api.post<FeedPost, AddCommentRequest>(
      `/posts/${postId}/comments`,
      payload,
    );
  }

  deletePost(postId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/posts/${postId}`);
  }
}
