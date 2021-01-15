import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './helpers/auth.guard';

import { PageNotFoundComponent } from './pages/not-found/page-not-found/page-not-found.component';
import { HomepageComponent } from './pages/homepage/homepage/homepage.component';
import { StylometryComponent } from './pages/stylometry/stylometry/stylometry.component';
import { FindAuthorComponent } from './pages/find-author/find-author/find-author.component';
import { ObfuscateComponent } from './pages/obfuscate/obfuscate/obfuscate.component';
import { LoginComponent } from './pages/login/login/login.component';
import { RegisterComponent } from './pages/register/register/register.component';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomepageComponent, canActivate: [AuthGuard] },
  { path: 'documents', component: StylometryComponent, canActivate: [AuthGuard]},
  { path: 'find-author', component: FindAuthorComponent, canActivate: [AuthGuard] },
  { path: 'obfuscate', component: ObfuscateComponent, canActivate: [AuthGuard]  },
  { path: '**', component: PageNotFoundComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})

export class AppRoutingModule {}
