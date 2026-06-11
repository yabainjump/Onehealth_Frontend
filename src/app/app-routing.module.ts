import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './guards/auth/auth.guard';
import { NetworkAwarePreloadingStrategy } from './core/routing/network-aware-preloading.strategy';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then((m) => m.HomePageModule),
    canLoad: [AuthGuard],
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/login/signup/signup.module').then((m) => m.SignupPageModule),
  },
  {
    path: 'register2',
    loadChildren: () =>
      import('./pages/login/signupd/signupd.module').then((m) => m.SignupdPageModule),
  },
  {
    path: 'forgot-password',
    loadChildren: () =>
      import('./pages/forgot-password/forgot-password.module').then(
        (m) => m.ForgotPasswordPageModule,
      ),
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('./pages/reset-password/reset-password.module').then(
        (m) => m.ResetPasswordPageModule,
      ),
  },
  {
    path: 'welcome',
    loadChildren: () => import('./pages/welcome/welcome.module').then((m) => m.WelcomePageModule),
  },
  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.module').then((m) => m.TabsPageModule),
    data: { preload: true },
  },
  {
    path: 'profils',
    loadChildren: () => import('./profils/profils.module').then((m) => m.ProfilsPageModule),
  },
  {
    path: 'post-detail',
    loadChildren: () => import('./post-detail/post-detail.module').then((m) => m.PostDetailPageModule),
  },
  {
    path: 'edit-profile',
    loadChildren: () =>
      import('./pages/edit-profile/edit-profile.module').then((m) => m.EditProfilePageModule),
  },
  {
    path: 'not-found',
    loadChildren: () =>
      import('./pages/not-found/not-found.module').then((m) => m.NotFoundPageModule),
  },
  {
    path: 'tags/:tag',
    loadComponent: () =>
      import('./pages/tag-posts/tag-posts.page').then((m) => m.TagPostsPage),
  },
  { path: '**', redirectTo: 'not-found' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: NetworkAwarePreloadingStrategy,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
