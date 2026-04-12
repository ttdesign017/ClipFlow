export interface ClipboardItem {
  id: string;
  kind: ItemType;
  timestamp: number;
  preview: string;
}

export type ItemType = 
  | { Text: { content: string } }
  | { Image: { path: string; width: number; height: number } }
  | { File: { paths: string[] } };

export interface Settings {
  max_items: number;
  auto_start: boolean;
}
