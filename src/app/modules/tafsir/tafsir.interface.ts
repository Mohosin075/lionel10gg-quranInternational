export interface ITafsir {
  surah: number;
  ayah: number;
  lang: string;
  edition: string;
  text: string;
  version: number;
}

export interface ITafsirWorkerJob {
  surah: number;
  edition: string;
  lang: string;
}
