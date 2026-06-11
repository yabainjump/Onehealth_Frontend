import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { Post, PublishService } from '../../services/publish/publish.service';

/**
 * Page de résultats d'un hashtag : liste les publications contenant #tag.
 * Composant standalone chargé via loadComponent sur la route /tags/:tag.
 */
@Component({
  selector: 'app-tag-posts',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  templateUrl: './tag-posts.page.html',
  styleUrls: ['./tag-posts.page.scss'],
})
export class TagPostsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishService = inject(PublishService);

  tag = '';
  posts: Post[] = [];
  loading = true;

  async ngOnInit(): Promise<void> {
    this.tag = (this.route.snapshot.paramMap.get('tag') || '').toLowerCase();
    if (!this.tag) {
      this.loading = false;
      return;
    }
    try {
      this.posts = await this.publishService.getPostsByHashtag(this.tag, 1, 30);
    } catch {
      this.posts = [];
    } finally {
      this.loading = false;
    }
  }

  openPost(post: Post): void {
    if (post?.id) {
      void this.router.navigate(['/post-detail'], { queryParams: { id: post.id } });
    }
  }

  snippet(post: Post): string {
    const text = `${post?.content || post?.title || ''}`.trim();
    return text.length > 220 ? `${text.slice(0, 220)}…` : text;
  }

  trackByPostId(_index: number, post: Post): string {
    return post?.id || String(_index);
  }
}
