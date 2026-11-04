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
  publication_date: string | null;
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

export interface Attribution {
  mostProbableAuthor: string;
  /** Every author, closest first. A lower delta means a closer match. */
  ranking: { author: string; delta: number }[];
  wordCount: number;
  warnings: string[];
}

export interface Analysis extends Attribution {
  tokensSignificantToAttribution: SignificantToken[];
}

export interface Registration {
  username: string;
  password1: string;
  password2: string;
}
