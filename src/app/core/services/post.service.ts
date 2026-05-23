import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AddCommentRequest,
  CreatePostRequest,
  FeedPost,
} from '../models/post.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly api = inject(ApiService);

  create(payload: CreatePostRequest): Observable<FeedPost> {
    return this.api.post<FeedPost, CreatePostRequest>('/posts', payload);
  }

  list(): Observable<FeedPost[]> {
    return this.api.get<FeedPost[]>('/posts');
  }

  listByUser(userId: string): Observable<FeedPost[]> {
    return this.api.get<FeedPost[]>(
      `/posts?authorId=${encodeURIComponent(userId)}`,
    );
  }

  update(
    postId: string,
    payload: Partial<CreatePostRequest>,
  ): Observable<FeedPost> {
    return this.api.patch<FeedPost, Partial<CreatePostRequest>>(
      `/posts/${postId}`,
      payload,
    );
  }

  remove(postId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/posts/${postId}`);
  }

  like(postId: string): Observable<FeedPost> {
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
}

