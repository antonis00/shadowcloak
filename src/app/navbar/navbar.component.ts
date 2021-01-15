import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticationService } from '../services';
import { User } from '../models';
// @ts-ignore
import jwt_decode from 'jwt-decode';
import { AuthGuard } from '../helpers/auth.guard';
import { TokenDTO } from '../dtos/token-dto';

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
    public authGuard: AuthGuard
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
    this.currentUser = localStorage.getItem('stylometryUserToken') == null ?
      '' :  this.currentUser = jwt_decode<TokenDTO>(localStorage.getItem('stylometryUserToken')).name;
  }

  toggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit() {
  }

}
