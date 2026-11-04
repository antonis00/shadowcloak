import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <main class="narrow-page">
      <h1>404</h1>
      <p>The page you requested was not found. <a routerLink="/">Go to the home page.</a></p>
    </main>
  `,
})
export class NotFound {}
