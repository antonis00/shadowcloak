import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import {MatAccordion} from '@angular/material/expansion';



@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  animations: []
})

export class StylometryComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  ngOnInit(): void {}

  constructor(private apiService: ApiService) { }

}
