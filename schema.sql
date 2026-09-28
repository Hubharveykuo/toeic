PRAGMA foreign_keys = ON;

CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  article_key TEXT NOT NULL UNIQUE,
  test_name TEXT NOT NULL,
  question_range TEXT NOT NULL,
  added_date TEXT
);

CREATE TABLE vocabulary (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word TEXT NOT NULL,
  chinese_meanings TEXT NOT NULL,
  part_of_speech TEXT,
  collocations TEXT,
  article_usage TEXT,
  importance TEXT CHECK (importance IN ('S','A','B','C')),
  familiarity TEXT CHECK (familiarity IN ('陌生','模糊','熟悉')),
  added_date TEXT,
  notion_url TEXT,
  UNIQUE(article_id, word COLLATE NOCASE),
  UNIQUE(article_id, position)
);

CREATE INDEX idx_vocab_article_position ON vocabulary(article_id, position);
CREATE INDEX idx_vocab_word ON vocabulary(word COLLATE NOCASE);
CREATE INDEX idx_vocab_review ON vocabulary(importance, familiarity);
