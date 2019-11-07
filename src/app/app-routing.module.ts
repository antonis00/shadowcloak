import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StylometryComponent } from './pages/stylometry/stylometry/stylometry.component';
import { PageNotFoundComponent } from './pages/not-found/page-not-found/page-not-found.component';
import { HomepageComponent } from './pages/homepage/homepage/homepage.component';
import { ObfuscationComponent } from './pages/obfuscation/obfuscation/obfuscation.component';


const routes: Routes = [
  { path: '', component: HomepageComponent },
  { path: 'homepage', component: HomepageComponent },
  {path: 'stylometry', component: StylometryComponent},
  {path: 'obfuscation', component: ObfuscationComponent},
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule {}
