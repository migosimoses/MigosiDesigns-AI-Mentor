export enum Author {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  author: Author;
  text: string;
  id: string;
  references?: {
    uri: string;
    title: string;
  }[];
  imageUrl?: string;
}
