export interface CreateDocumentDTO {
  id?: number;
  active: true;
  title: string;
  description: string;
  body: string;
  publicationDate: Date;
  author: number;
  group: number;
}
