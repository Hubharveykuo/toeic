-- Any returned row represents a validation problem.

SELECT 'foreign_key_error' AS problem
FROM pragma_foreign_key_check
LIMIT 1;

SELECT 'empty_article_key:' || id AS problem
FROM articles
WHERE trim(article_key) = '';

SELECT 'empty_word:' || id AS problem
FROM vocabulary
WHERE trim(word) = '';

SELECT 'empty_chinese_meanings:' || id AS problem
FROM vocabulary
WHERE trim(chinese_meanings) = '';

SELECT 'invalid_importance:' || id AS problem
FROM vocabulary
WHERE importance NOT IN ('S','A','B','C') OR importance IS NULL;

SELECT 'invalid_familiarity:' || id AS problem
FROM vocabulary
WHERE familiarity NOT IN ('陌生','模糊','熟悉') OR familiarity IS NULL;

SELECT 'invalid_position:' || article_id || ':' || id AS problem
FROM vocabulary
WHERE position < 1 OR position IS NULL;

SELECT 'non_contiguous_positions:' || article_id AS problem
FROM vocabulary
GROUP BY article_id
HAVING MIN(position) <> 1
    OR MAX(position) <> COUNT(*)
    OR COUNT(DISTINCT position) <> COUNT(*);

SELECT 'duplicate_word:' || article_id || ':' || lower(word) AS problem
FROM vocabulary
GROUP BY article_id, lower(word)
HAVING COUNT(*) > 1;
