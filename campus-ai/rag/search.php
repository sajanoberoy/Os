<?php
/**
 * Campus AI — Vector & Semantic Search Engine
 * Location: rag/search.php
 */

require_once dirname(__DIR__) . '/config/config.php';
require_once __DIR__ . '/embed.php';

class RAGSearch {
    private static ?array $chunks = null;
    private static ?array $embeddings = null;
    private static ?array $vocabulary = null;

    private static function loadIndex(): bool {
        if (self::$chunks !== null) return true;

        $chunksFile = PROCESSED_PATH . '/chunks.json';
        $embedsFile = PROCESSED_PATH . '/embeddings.json';

        if (!file_exists($chunksFile) || !file_exists($embedsFile)) {
            return false;
        }

        self::$chunks = json_decode(file_get_contents($chunksFile), true) ?: [];
        $embedData = json_decode(file_get_contents($embedsFile), true) ?: [];
        self::$embeddings = $embedData['embeddings'] ?? [];
        self::$vocabulary = $embedData['vocabulary'] ?? [];

        return true;
    }

    public static function findRelevant(string $query, int $topOfficial = 3, int $topExperience = 2): array {
        if (!self::loadIndex() || empty(self::$vocabulary)) {
            return [
                'official' => [],
                'experience' => [],
                'query' => $query
            ];
        }

        $queryVecData = VectorEngine::createVector($query, self::$vocabulary);
        $queryVec = $queryVecData['vector'];
        $queryNorm = $queryVecData['norm'];
        $queryLower = strtolower($query);

        $embedMap = [];
        foreach (self::$embeddings as $emb) {
            $embedMap[$emb['chunk_id']] = $emb;
        }

        $scored = [];
        foreach (self::$chunks as $chunk) {
            $chunkId = $chunk['id'];
            $emb = $embedMap[$chunkId] ?? null;
            $sim = 0.0;

            if ($emb) {
                $sim = VectorEngine::cosineSimilarity($queryVec, $queryNorm, $emb['vector'], (float)$emb['norm']);
            }

            // Keyword boost for high-salience terms
            $chunkText = strtolower($chunk['text']);
            $boost = 0.0;
            $tokens = preg_split('/\s+/', $queryLower);
            foreach ($tokens as $t) {
                if (strlen($t) > 2 && strpos($chunkText, $t) !== false) {
                    $boost += 0.06;
                }
            }

            $finalScore = min(1.0, ($sim * 0.65) + $boost);

            if ($finalScore >= 0.04) {
                $scored[] = [
                    'chunk' => $chunk,
                    'score' => round($finalScore, 3),
                ];
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        $official = [];
        $experience = [];

        foreach ($scored as $item) {
            if ($item['chunk']['type'] === 'official' && count($official) < $topOfficial) {
                $official[] = $item;
            } elseif ($item['chunk']['type'] === 'experience' && count($experience) < $topExperience) {
                $experience[] = $item;
            }
        }

        return [
            'official' => $official,
            'experience' => $experience,
            'query' => $query
        ];
    }
}
