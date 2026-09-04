<?php
/**
 * Campus AI — Vector & Embedding Engine
 * Location: rag/embed.php
 */

require_once dirname(__DIR__) . '/config/config.php';

class VectorEngine {
    /**
     * Tokenizes and normalizes text into word frequency mapping
     */
    public static function tokenize(string $text): array {
        $clean = strtolower(preg_replace('/[^a-zA-Z0-9\s]/', ' ', $text));
        $words = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
        $counts = [];
        foreach ($words as $word) {
            if (strlen($word) >= 2) {
                $counts[$word] = ($counts[$word] ?? 0) + 1;
            }
        }
        return $counts;
    }

    /**
     * Builds dense vector against global vocabulary
     */
    public static function createVector(string $text, array $vocabulary): array {
        $counts = self::tokenize($text);
        $vector = [];
        $sumSq = 0.0;

        foreach ($vocabulary as $word) {
            $freq = $counts[$word] ?? 0;
            $val = $freq > 0 ? (1 + log($freq)) : 0.0;
            $vector[] = $val;
            $sumSq += ($val * $val);
        }

        $norm = sqrt($sumSq) ?: 1.0;
        return [
            'vector' => $vector,
            'norm' => $norm
        ];
    }

    /**
     * Computes cosine similarity between two normalized vectors
     */
    public static function cosineSimilarity(array $vecA, float $normA, array $vecB, float $normB): float {
        if ($normA <= 0.0 || $normB <= 0.0) return 0.0;
        $dotProduct = 0.0;
        $len = min(count($vecA), count($vecB));
        for ($i = 0; $i < $len; $i++) {
            if ($vecA[$i] > 0 && $vecB[$i] > 0) {
                $dotProduct += ($vecA[$i] * $vecB[$i]);
            }
        }
        return $dotProduct / ($normA * $normB);
    }
}
