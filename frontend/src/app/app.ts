import { TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { Feedback } from './shared/feedback';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly links = [
    { path: '/home', label: 'Home' },
    { path: '/documents', label: 'Documents' },
    { path: '/find-author', label: 'Find Author' },
    { path: '/obfuscate', label: 'Obfuscate' },
  ];

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.feedback.problem('Could not log out. You are still logged in, please try again.'),
    });
  }
}
