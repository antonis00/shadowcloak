import { Routes } from '@angular/router';

import { authGuard } from './core/auth';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { NotFound } from './pages/not-found/not-found';
import { Register } from './pages/register/register';

// The three working pages load on demand, because they bring the heavier components and the editor.
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [authGuard] },
  {
    path: 'documents',
    loadComponent: () => import('./pages/documents/documents').then(page => page.Documents),
    canActivate: [authGuard],
  },
  {
    path: 'find-author',
    loadComponent: () => import('./pages/find-author/find-author').then(page => page.FindAuthor),
    canActivate: [authGuard],
  },
  {
    path: 'obfuscate',
    loadComponent: () => import('./pages/obfuscate/obfuscate').then(page => page.Obfuscate),
    canActivate: [authGuard],
  },
  { path: '**', component: NotFound, canActivate: [authGuard] },
];
