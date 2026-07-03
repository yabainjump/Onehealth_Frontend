import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AdminAlert,
  AdminCertificationRequest,
  AdminPost,
  AdminService,
  AdminStats,
} from '../../core/services/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { PublicUser } from '../../core/models/user.models';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

type AdminSection = 'overview' | 'users' | 'certifications' | 'content';
type ContentMode = 'posts' | 'alerts';

/** Dashboard d'administration : KPIs, utilisateurs, certifications, modération. */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  section: AdminSection = 'overview';
  currentAdminId = '';

  // Vue d'ensemble
  stats: AdminStats | null = null;
  loadingStats = true;

  // Utilisateurs
  users: PublicUser[] = [];
  usersTotal = 0;
  usersPage = 1;
  usersSearch = '';
  usersRole = '';
  usersStatus = '';
  loadingUsers = false;

  // Certifications
  certifications: AdminCertificationRequest[] = [];
  certificationsStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  loadingCertifications = false;
  processingRequestId = '';

  // Contenu (modération posts + alertes)
  contentMode: ContentMode = 'posts';
  posts: AdminPost[] = [];
  postsTotal = 0;
  postsPage = 1;
  postsSearch = '';
  loadingPosts = false;
  alerts: AdminAlert[] = [];
  alertsTotal = 0;
  alertsPage = 1;
  alertsSearch = '';
  loadingAlerts = false;
  processingContentId = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    this.currentAdminId = (await this.authService.checkAuth())?.uid || '';
    await Promise.all([this.loadStats(), this.loadUsers(), this.loadCertifications()]);
  }

  onSectionChange(): void {
    if (this.section === 'content' && !this.posts.length && !this.alerts.length) {
      void this.loadPosts();
    }
  }

  /** Navigation via la sidebar (PC) : section + sous-mode éventuel. */
  selectSection(section: AdminSection, mode?: ContentMode): void {
    this.section = section;
    if (mode) {
      this.contentMode = mode;
      this.onContentModeChange();
    }
    this.onSectionChange();
  }

  onContentModeChange(): void {
    if (this.contentMode === 'posts' && !this.posts.length) {
      void this.loadPosts();
    }
    if (this.contentMode === 'alerts' && !this.alerts.length) {
      void this.loadAlerts();
    }
  }

  private debounce(run: () => void): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(run, 350);
  }

  // ===== Vue d'ensemble =====
  async loadStats(): Promise<void> {
    this.loadingStats = true;
    try {
      this.stats = await this.adminService.getStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.LOAD_ERR'), 'danger');
    } finally {
      this.loadingStats = false;
    }
  }

  // ===== Utilisateurs =====
  onSearchChange(): void {
    this.debounce(() => {
      this.usersPage = 1;
      void this.loadUsers();
    });
  }

  onUserFilterChange(): void {
    this.usersPage = 1;
    void this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loadingUsers = true;
    try {
      const result = await this.adminService.listUsers({
        search: this.usersSearch.trim(),
        role: this.usersRole || undefined,
        status: this.usersStatus || undefined,
        page: this.usersPage,
        limit: 20,
      });
      this.users = result.items;
      this.usersTotal = result.total;
    } catch {
      await this.toast(this.translate.instant('ADMIN.LOAD_ERR'), 'danger');
    } finally {
      this.loadingUsers = false;
    }
  }

  get usersTotalPages(): number {
    return Math.max(1, Math.ceil(this.usersTotal / 20));
  }

  changeUsersPage(delta: number): void {
    const next = this.usersPage + delta;
    if (next < 1 || next > this.usersTotalPages) {
      return;
    }
    this.usersPage = next;
    void this.loadUsers();
  }

  photo(user: PublicUser | null): string {
    return resolveMediaUrl(user?.photoURL || '') || 'assets/default-profile.png';
  }

  displayName(user: PublicUser | null): string {
    if (!user) {
      return '—';
    }
    return (
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email
    );
  }

  isSelf(user: PublicUser): boolean {
    return user.id === this.currentAdminId;
  }

  async toggleRole(user: PublicUser): Promise<void> {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant('ADMIN.ROLE_CONFIRM_TITLE'),
      message: this.translate.instant(
        newRole === 'admin' ? 'ADMIN.ROLE_PROMOTE_MSG' : 'ADMIN.ROLE_DEMOTE_MSG',
      ),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.SAVE'),
          handler: () => {
            void this.applyRole(user, newRole);
            return true;
          },
        },
      ],
    });
    await confirm.present();
  }

  private async applyRole(user: PublicUser, role: 'user' | 'admin'): Promise<void> {
    try {
      const updated = await this.adminService.updateUserRole(user.id, role);
      Object.assign(user, updated);
      await this.toast(this.translate.instant('ADMIN.DONE'), 'success');
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    }
  }

  async toggleBan(user: PublicUser): Promise<void> {
    const banning = !user.isBanned;
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant(
        banning ? 'ADMIN.BAN_CONFIRM_TITLE' : 'ADMIN.UNBAN_CONFIRM_TITLE',
      ),
      message: this.displayName(user),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.SAVE'),
          handler: () => {
            void this.applyBan(user, banning);
            return true;
          },
        },
      ],
    });
    await confirm.present();
  }

  private async applyBan(user: PublicUser, banned: boolean): Promise<void> {
    try {
      const updated = await this.adminService.setUserBanned(user.id, banned);
      Object.assign(user, updated);
      await this.toast(this.translate.instant('ADMIN.DONE'), 'success');
      void this.loadStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    }
  }

  openProfile(user: PublicUser | null): void {
    if (user?.id) {
      void this.router.navigate(['/tabs/profils', user.id]);
    }
  }

  // ===== Certifications =====
  onCertificationsFilterChange(): void {
    void this.loadCertifications();
  }

  async loadCertifications(): Promise<void> {
    this.loadingCertifications = true;
    try {
      const result = await this.adminService.listCertifications(this.certificationsStatus);
      this.certifications = result.items;
    } catch {
      await this.toast(this.translate.instant('ADMIN.LOAD_ERR'), 'danger');
    } finally {
      this.loadingCertifications = false;
    }
  }

  docSrc(url: string): string {
    return resolveMediaUrl(url) || url;
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
  }

  async approve(request: AdminCertificationRequest): Promise<void> {
    this.processingRequestId = request.id;
    try {
      await this.adminService.approveCertification(request.id);
      this.certifications = this.certifications.filter((r) => r.id !== request.id);
      await this.toast(this.translate.instant('ADMIN.CERT_APPROVED'), 'success');
      void this.loadStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    } finally {
      this.processingRequestId = '';
    }
  }

  async reject(request: AdminCertificationRequest): Promise<void> {
    const prompt = await this.alertCtrl.create({
      header: this.translate.instant('ADMIN.REJECT_TITLE'),
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: this.translate.instant('ADMIN.REJECT_REASON_PLACEHOLDER'),
        },
      ],
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ADMIN.REJECT'),
          handler: (data) => {
            const reason = `${data?.reason || ''}`.trim();
            if (!reason) {
              return false; // motif obligatoire
            }
            void this.applyReject(request, reason);
            return true;
          },
        },
      ],
    });
    await prompt.present();
  }

  private async applyReject(
    request: AdminCertificationRequest,
    reason: string,
  ): Promise<void> {
    this.processingRequestId = request.id;
    try {
      await this.adminService.rejectCertification(request.id, reason);
      this.certifications = this.certifications.filter((r) => r.id !== request.id);
      await this.toast(this.translate.instant('ADMIN.CERT_REJECTED'), 'success');
      void this.loadStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    } finally {
      this.processingRequestId = '';
    }
  }

  // ===== Contenu : posts =====
  onPostsSearchChange(): void {
    this.debounce(() => {
      this.postsPage = 1;
      void this.loadPosts();
    });
  }

  async loadPosts(): Promise<void> {
    this.loadingPosts = true;
    try {
      const result = await this.adminService.listPosts(
        this.postsSearch.trim(),
        this.postsPage,
      );
      this.posts = result.items;
      this.postsTotal = result.total;
    } catch {
      await this.toast(this.translate.instant('ADMIN.LOAD_ERR'), 'danger');
    } finally {
      this.loadingPosts = false;
    }
  }

  get postsTotalPages(): number {
    return Math.max(1, Math.ceil(this.postsTotal / 20));
  }

  changePostsPage(delta: number): void {
    const next = this.postsPage + delta;
    if (next < 1 || next > this.postsTotalPages) {
      return;
    }
    this.postsPage = next;
    void this.loadPosts();
  }

  async togglePostHidden(post: AdminPost): Promise<void> {
    this.processingContentId = post.id;
    try {
      const result = await this.adminService.setPostHidden(post.id, !post.isHidden);
      post.isHidden = result.isHidden;
      await this.toast(
        this.translate.instant(post.isHidden ? 'ADMIN.PAUSED' : 'ADMIN.RESUMED'),
        'success',
      );
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    } finally {
      this.processingContentId = '';
    }
  }

  async deletePost(post: AdminPost): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant('ADMIN.DELETE_POST_TITLE'),
      message: (post.content || post.title || '').slice(0, 120),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ADMIN.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.applyDeletePost(post);
            return true;
          },
        },
      ],
    });
    await confirm.present();
  }

  private async applyDeletePost(post: AdminPost): Promise<void> {
    try {
      await this.adminService.deletePost(post.id);
      this.posts = this.posts.filter((p) => p.id !== post.id);
      await this.toast(this.translate.instant('ADMIN.DONE'), 'success');
      void this.loadStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    }
  }

  // ===== Contenu : alertes =====
  onAlertsSearchChange(): void {
    this.debounce(() => {
      this.alertsPage = 1;
      void this.loadAlerts();
    });
  }

  async loadAlerts(): Promise<void> {
    this.loadingAlerts = true;
    try {
      const result = await this.adminService.listAlerts(
        this.alertsSearch.trim(),
        this.alertsPage,
      );
      this.alerts = result.items;
      this.alertsTotal = result.total;
    } catch {
      await this.toast(this.translate.instant('ADMIN.LOAD_ERR'), 'danger');
    } finally {
      this.loadingAlerts = false;
    }
  }

  get alertsTotalPages(): number {
    return Math.max(1, Math.ceil(this.alertsTotal / 20));
  }

  changeAlertsPage(delta: number): void {
    const next = this.alertsPage + delta;
    if (next < 1 || next > this.alertsTotalPages) {
      return;
    }
    this.alertsPage = next;
    void this.loadAlerts();
  }

  async toggleAlertHidden(alert: AdminAlert): Promise<void> {
    this.processingContentId = alert.id;
    try {
      const result = await this.adminService.setAlertHidden(alert.id, !alert.isHidden);
      alert.isHidden = result.isHidden;
      await this.toast(
        this.translate.instant(alert.isHidden ? 'ADMIN.PAUSED' : 'ADMIN.RESUMED'),
        'success',
      );
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    } finally {
      this.processingContentId = '';
    }
  }

  async deleteAlert(alert: AdminAlert): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: this.translate.instant('ADMIN.DELETE_ALERT_TITLE'),
      message: alert.title,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ADMIN.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.applyDeleteAlert(alert);
            return true;
          },
        },
      ],
    });
    await confirm.present();
  }

  private async applyDeleteAlert(alert: AdminAlert): Promise<void> {
    try {
      await this.adminService.deleteAlert(alert.id);
      this.alerts = this.alerts.filter((a) => a.id !== alert.id);
      await this.toast(this.translate.instant('ADMIN.DONE'), 'success');
      void this.loadStats();
    } catch {
      await this.toast(this.translate.instant('ADMIN.ACTION_ERR'), 'danger');
    }
  }

  severityColor(severity: string): string {
    return severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'medium';
  }

  back(): void {
    void this.router.navigateByUrl('/tabs/dashbord');
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' = 'success',
  ): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2000, color });
    await t.present();
  }
}
