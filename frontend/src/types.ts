export interface Message {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  analysis?: Analysis;
}

export interface Analysis {
  word_count: WordCount;
  readability: Readability;
  weak_words: WeakWords;
  long_sentences: LongSentences;
  repeated_words: RepeatedWords;
}

export interface WordCount {
  words: number;
  sentences: number;
  characters: number;
  avg_sentence_length: number;
}

export interface Readability {
  score: number;
  interpretation: string;
}

export interface WeakWords {
  count: number;
  occurrences: Record<string, number>;
}

export interface LongSentences {
  count: number;
  sentences: Array<{ sentence: string; word_count: number }>;
}

export interface RepeatedWords {
  count: number;
  words: Record<string, number>;
}

export interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  email: string;
  display_name?: string;
  updated_at?: string;
}
