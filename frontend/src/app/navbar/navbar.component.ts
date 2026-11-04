import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthenticationService } from '../services';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  public currentUser;
  navbarOpen = false;

  constructor(
    public router: Router,
    private authenticationService: AuthenticationService,
    private snackBar: MatSnackBar
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
  }

  toggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
  }

  logout() {
    this.authenticationService.logout().subscribe(
      () => this.router.navigate(['/login']),
      () => this.snackBar.open('Could not log out. You are still logged in, please try again.', '', { duration: 5000 })
    );
  }

  ngOnInit() {
  }

}
