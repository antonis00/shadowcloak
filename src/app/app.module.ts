import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { MatDividerModule, MatOption, MatSelect, MatSnackBarModule } from '@angular/material';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { PageNotFoundComponent } from './pages/not-found/page-not-found/page-not-found.component';
import { HomepageComponent } from './pages/homepage/homepage/homepage.component';
import { StylometryComponent } from './pages/stylometry/stylometry/stylometry.component';
import { FindAuthorComponent } from './pages/find-author/find-author/find-author.component';
import { ObfuscateComponent } from './pages/obfuscate/obfuscate/obfuscate.component';
import { RegisterComponent } from './pages/register/register/register.component';
import { LoginComponent } from './pages/login/login/login.component';

import { InterceptorService } from './services/interceptor.service';
import { ApiService } from './services/api.service';
import { UserService } from './services/user.service';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material';
import { MatOptionModule } from '@angular/material';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    StylometryComponent,
    PageNotFoundComponent,
    HomepageComponent,
    FindAuthorComponent,
    ObfuscateComponent,
    RegisterComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatSelectModule,
    MatOptionModule
  ],
  providers: [
    ApiService,
    UserService, { provide: HTTP_INTERCEPTORS, useClass: InterceptorService, multi: true }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
