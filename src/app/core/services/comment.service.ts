import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AddCommentRequest, PostComment } from '../models/post.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(ApiService);

  list(postId: string): Observable<PostComment[]> {
    return this.api.get<PostComment[]>(`/posts/${postId}/comments`);
  }

  create(postId: string, payload: AddCommentRequest): Observable<unknown> {
    return this.api.post<unknown, AddCommentRequest>(
      `/posts/${postId}/comments`,
      payload,
    );
  }
}

