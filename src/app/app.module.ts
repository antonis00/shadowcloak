import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { StylometryComponent } from './pages/stylometry/stylometry/stylometry.component';
import { PageNotFoundComponent } from './pages/not-found/page-not-found/page-not-found.component';
import { HomepageComponent } from './pages/homepage/homepage/homepage.component';
import { ObfuscationComponent } from './pages/obfuscation/obfuscation/obfuscation.component';

@NgModule({
   declarations: [
      AppComponent,
      NavbarComponent,
      StylometryComponent,
      ObfuscationComponent,
      PageNotFoundComponent,
      HomepageComponent
   ],
   imports: [
      BrowserModule,
      AppRoutingModule
   ],
   providers: [],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
