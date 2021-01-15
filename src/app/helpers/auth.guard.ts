import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import jwt_decode from 'jwt-decode';
import { TokenDTO } from '../dtos/token-dto';
import { AuthenticationService } from '../services';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  public currentUser;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
    this.currentUser = localStorage.getItem('stylometryUserToken') == null ?
      '' :  this.currentUser = jwt_decode<TokenDTO>(localStorage.getItem('stylometryUserToken')).name;

    if (this.currentUser) {
      return true;
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }
}
