import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService as CoreApiService } from '../../core/services/api.service';
import { UploadService } from '../../core/services/upload.service';
import {
  mediaPosterUrl,
  mediaThumbUrl,
  resolveMediaUrl,
} from '../../core/utils/media-url.util';

export type PostAttachmentType = 'video' | 'document';

export interface PostAttachment {
  type: PostAttachmentType;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  posterUrl?: string;
}

export interface Post {
  id?: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  // URLs originales (pleine resolution), utilisees en repli si la miniature echoue.
  fullImageUrl?: string;
  fullImageUrls?: string[];
  attachment?: PostAttachment | null;
  likes: number;
  title?: string;
  timestamp: Date;
  newComment?: string;
  comments?: CommentData[];
  relativeTime?: string;
  likedBy?: string[];
  userHasLiked?: boolean;
  author?: {
    firstName: string;
    userName: string;
    lastName: string;
    institution: string;
    photoURL?: string;
  };
}

export interface CommentData {
  id?: string;
  comment: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  likesCount?: number;
  userHasLiked?: boolean;
  createdAt?: string | Date;
}

@Injectable({ providedIn: 'root' })
export class PublishService {
  private readonly userCache = new Map<string, any>();
  private readonly userRequestCache = new Map<string, Promise<any>>();

  constructor(
    private readonly api: CoreApiService,
    private readonly uploadService: UploadService,
  ) {}

  async addPost(post: Post): Promise<{ id: string }> {
    const created = await firstValueFrom(
      this.api.post<any, any>('/posts', {
        title: post.title || '',
        content: post.content || '',
        imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : []),
        attachment: post.attachment || undefined,
      }),
    );

    return { id: created?.id };
  }

  async uploadImage(file: File): Promise<string> {
    const uploaded = await firstValueFrom(this.uploadService.uploadPost(file));
    return uploaded.url;
  }

  async uploadAttachment(file: File): Promise<{
    url: string;
    originalName?: string;
    mimetype?: string;
    size?: number;
  }> {
    return firstValueFrom(this.uploadService.uploadPost(file));
  }

  async getUser(uid: string): Promise<any> {
    if (!uid) return null;

    if (this.userCache.has(uid)) {
      return this.userCache.get(uid);
    }

    if (this.userRequestCache.has(uid)) {
      return this.userRequestCache.get(uid)!;
    }

    const request = firstValueFrom(this.api.get<any>(`/users/${uid}`))
      .then((user) => {
        const normalized = {
          ...user,
          uid: user?.id || uid,
          name:
            user?.name ||
            user?.username ||
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          photo:
            resolveMediaUrl(user?.photo || user?.photoURL) ||
            'assets/default-profile.png',
          photoURL:
            resolveMediaUrl(user?.photoURL || user?.photo) ||
            'assets/default-profile.png',
        };
        this.userCache.set(uid, normalized);
        return normalized;
      })
      .finally(() => {
        this.userRequestCache.delete(uid);
      });

    this.userRequestCache.set(uid, request);
    return request;
  }

  async likePost(postId: string, userId: string): Promise<boolean> {
    void userId;
    await firstValueFrom(this.api.post<any, Record<string, never>>(`/posts/${postId}/like`, {}));
    return true;
  }

  async unlikePost(postId: string): Promise<boolean> {
    await firstValueFrom(this.api.delete<any>(`/posts/${postId}/like`));
    return true;
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const post = await firstValueFrom(
      this.api.get<any>(`/posts/${id}`).pipe(
        map((value) => this.toLegacyPost(value)),
        catchError(() => of(undefined)),
      ),
    );
    return post;
  }

  async addComment(
    postId: string,
    commentData: CommentData,
  ): Promise<CommentData | null> {
    const updatedPost = await firstValueFrom(
      this.api.post<any, { text: string }>(`/posts/${postId}/comments`, {
        text: commentData.comment,
      }),
    );

    const mapped = this.toLegacyPost(updatedPost);
    const comments = mapped.comments || [];
    if (!comments.length) {
      return null;
    }

    return comments[comments.length - 1] ?? null;
  }

  async likeComment(
    postId: string,
    commentId: string,
    comment?: Partial<CommentData>,
  ): Promise<void> {
    const payload = this.buildCommentContext(comment);
    await firstValueFrom(
      this.api.post<any, Record<string, string>>(
        `/posts/${postId}/comments/${commentId}/like`,
        payload,
      ),
    );
  }

  async unlikeComment(
    postId: string,
    commentId: string,
    comment?: Partial<CommentData>,
  ): Promise<void> {
    const payload = this.buildCommentContext(comment);
    await firstValueFrom(
      this.api.delete<any>(`/posts/${postId}/comments/${commentId}/like`, {
        body: payload,
      }),
    );
  }

  getPosts(): Observable<Post[]> {
    return this.api
      .get<any[]>('/posts')
      .pipe(map((posts) => (posts || []).map((post) => this.toLegacyPost(post))));
  }

  async getPostsPage(page = 1, limit = 7): Promise<Post[]> {
    const posts = await firstValueFrom(
      this.api.get<any[]>(`/posts?page=${page}&limit=${limit}`),
    );
    return (posts || []).map((post) => this.toLegacyPost(post));
  }

  getPostsByAuthor(userId: string, pageSize = 20): Observable<Post[]> {
    return this.api
      .get<any[]>(`/posts/user/${encodeURIComponent(userId)}?limit=${pageSize}`)
      .pipe(
        map((posts) => (posts || []).map((post) => this.toLegacyPost(post))),
        catchError(() => of([])),
      );
  }

  async deletePostWithImages(postId: string, imageUrls: string[] = []): Promise<void> {
    void imageUrls;
    await firstValueFrom(this.api.delete<{ success: boolean }>(`/posts/${postId}`));
  }

  private toLegacyPost(post: any): Post {
    const author = post?.author;
    const comments = (post?.comments || []).map((comment: any) => ({
      id: comment?.id || '',
      comment: comment?.text || '',
      userId: comment?.author?.id || '',
      userName:
        comment?.author?.username ||
        `${comment?.author?.firstName || ''} ${comment?.author?.lastName || ''}`.trim(),
      userPhoto:
        resolveMediaUrl(comment?.author?.photoURL) || 'assets/default-profile.png',
      likesCount: comment?.likesCount ?? 0,
      userHasLiked: !!comment?.userHasLiked,
      createdAt: comment?.createdAt,
    }));

    return {
      id: post?.id,
      authorId: author?.id || post?.authorId || '',
      title: post?.title || '',
      content: post?.content || '',
      imageUrl: mediaThumbUrl(post?.imageUrls?.[0], 1000),
      imageUrls: (post?.imageUrls || []).map((url: string) => mediaThumbUrl(url, 1000)),
      fullImageUrl: resolveMediaUrl(post?.imageUrls?.[0]),
      fullImageUrls: (post?.imageUrls || []).map((url: string) => resolveMediaUrl(url)),
      attachment: post?.attachment
        ? {
            type: post.attachment.type,
            url: resolveMediaUrl(post.attachment.url),
            fileName: post.attachment.fileName,
            mimeType: post.attachment.mimeType,
            size: post.attachment.size,
            posterUrl:
              post.attachment.type === 'video'
                ? mediaPosterUrl(post.attachment.url)
                : undefined,
          }
        : null,
      likes: post?.likesCount ?? post?.likes ?? 0,
      likedBy: [],
      userHasLiked: !!post?.userHasLiked,
      comments,
      timestamp: new Date(post?.createdAt || post?.timestamp || Date.now()),
      author: author
        ? {
            userName: author.username || '',
            firstName: author.firstName || '',
            lastName: author.lastName || '',
            institution: author.institution || '',
            photoURL: resolveMediaUrl(author.photoURL) || 'assets/default-profile.png',
          }
        : undefined,
    };
  }

  private buildCommentContext(comment?: Partial<CommentData>): Record<string, string> {
    if (!comment) {
      return {};
    }

    const payload: Record<string, string> = {};
    const text = `${comment.comment || ''}`.trim();
    const authorId = `${comment.userId || ''}`.trim();

    if (text) {
      payload.text = text;
    }
    if (authorId) {
      payload.authorId = authorId;
    }

    if (comment.createdAt) {
      const parsed = new Date(comment.createdAt).getTime();
      if (!Number.isNaN(parsed)) {
        payload.createdAt = new Date(parsed).toISOString();
      }
    }

    return payload;
  }
}
