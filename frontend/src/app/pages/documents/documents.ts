import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { Observable, forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { Author, AuthorDocuments, DocumentRecord, Group } from '../../core/api.types';
import { Feedback } from '../../shared/feedback';
import { DocumentDialog, DocumentDialogData } from './document-dialog';
import { NamedDialog, NamedDialogData } from './named-dialog';

@Component({
  imports: [
    MatButtonModule, MatDividerModule, MatExpansionModule, MatFormFieldModule,
    MatIconModule, MatMenuModule, MatSelectModule,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class Documents {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(Feedback);
  private readonly accordion = viewChild(MatAccordion);

  readonly groups = signal<Group[]>([]);
  readonly authors = signal<Author[]>([]);
  readonly documents = signal<AuthorDocuments[]>([]);
  readonly selectedGroup = signal<number | null>(null);
  readonly selectedAuthors = signal<number[]>([]);
  readonly currentGroup = computed(() => this.groups().find(group => group.id === this.selectedGroup()));

  constructor() {
    this.reload();
  }

  /** Loads everything the filters depend on, keeping only the choices that still exist. */
  reload(): void {
    forkJoin([this.api.groups(), this.api.authors()]).subscribe(([groups, authors]) => {
      this.groups.set(groups);
      this.authors.set(authors);
      if (!groups.some(group => group.id === this.selectedGroup())) {
        this.selectedGroup.set(groups[0]?.id ?? null);
      }
      this.selectedAuthors.update(ids => ids.filter(id => authors.some(author => author.id === id)));
      this.loadDocuments();
    });
  }

  loadDocuments(): void {
    const group = this.selectedGroup();
    if (group === null) {
      this.documents.set([]);
      return;
    }
    this.api.documentsByAuthor(group, this.selectedAuthors()).subscribe(documents => this.documents.set(documents));
  }

  chooseGroup(group: number): void {
    this.selectedGroup.set(group);
    this.loadDocuments();
  }

  collapseAll(): void {
    this.accordion()?.closeAll();
  }

  editDocument(document?: DocumentRecord): void {
    const data: DocumentDialogData = {
      document,
      authors: this.authors(),
      groups: this.groups(),
      group: this.selectedGroup(),
    };
    this.reloadAfter(this.dialog.open(DocumentDialog, { data, width: '640px' }).afterClosed());
  }

  editAuthor(author?: Author): void {
    this.openNamedDialog({ kind: 'Author', record: author });
  }

  editGroup(group?: Group): void {
    this.openNamedDialog({ kind: 'Group', record: group });
  }

  deleteDocument(document: DocumentRecord): void {
    this.confirmDelete('Document', document.title, this.api.deleteDocument(document.id));
  }

  deleteAuthor(author: Pick<Author, 'id' | 'name'>): void {
    this.confirmDelete('Author', author.name, this.api.deleteAuthor(author.id));
  }

  deleteGroup(group: Group): void {
    this.confirmDelete('Group', group.name, this.api.deleteGroup(group.id));
  }

  /** The list only carries an author's ID and name, so editing fetches the rest from what's loaded. */
  authorRecord(id: number): Author | undefined {
    return this.authors().find(author => author.id === id);
  }

  private openNamedDialog(data: NamedDialogData): void {
    this.reloadAfter(this.dialog.open(NamedDialog, { data, width: '480px' }).afterClosed());
  }

  private reloadAfter(closed: Observable<boolean | undefined>): void {
    closed.subscribe(saved => {
      if (saved) {
        this.reload();
      }
    });
  }

  private confirmDelete(kind: string, name: string, request: Observable<void>): void {
    const lines = [`Are you sure you want to delete "${name}"?`];
    if (kind !== 'Document') {
      lines.push(`All documents of that ${kind.toLowerCase()} will also be deleted!`);
    }
    this.feedback.confirm(`Delete ${kind}`, 'Delete', ...lines).subscribe(confirmed => {
      if (confirmed) {
        request.subscribe({
          next: () => {
            this.feedback.success(`${kind} deleted.`);
            this.reload();
          },
          error: response => this.feedback.message('Request Unsuccessful', apiErrorMessage(response)),
        });
      }
    });
  }
}
