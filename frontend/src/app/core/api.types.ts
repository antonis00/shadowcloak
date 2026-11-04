export interface Author {
  id: number;
  name: string;
  description: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
}

export interface DocumentRecord {
  id: number;
  author: number;
  group: number;
  title: string;
  description: string;
  body: string;
  active: boolean;
  publication_date: string;
}

export type DocumentInput = Omit<DocumentRecord, 'id'>;

export interface NamedInput {
  name: string;
  description: string;
}

export interface AuthorDocuments {
  id: number;
  name: string;
  documents: DocumentRecord[];
}

export interface SignificantToken {
  token: string;
  partOfSpeech: string;
  score: number;
}

export interface Analysis {
  mostProbableAuthor: string;
  tokensSignificantToAttribution: SignificantToken[];
}

export interface Registration {
  username: string;
  password1: string;
  password2: string;
}
