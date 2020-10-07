import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatAccordion } from '@angular/material/expansion';
import { DocumentGroup } from 'src/app/models/document-group';
import { DocumentByAuthor } from 'src/app/models/document-by-author';
import { groupBy, map, mergeMap, reduce } from 'rxjs/operators';



@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  animations: []
})

export class StylometryComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  documentGroups: DocumentGroup[] = [];
  documentsByAuthor: DocumentByAuthor[] = [];

  @Input()
  addedAuthors: number[] = [];

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.apiService.getDocumentsGroups().subscribe(res => {
      this.documentGroups = res;
    });


    this.apiService.getDocuments('books').subscribe(res => {
      this.documentsByAuthor = res;
    });

  }

}
