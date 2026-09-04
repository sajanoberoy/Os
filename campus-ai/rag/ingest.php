<?php
/**
 * Campus AI — Ingestion & Processing CLI/Web Script
 * Location: rag/ingest.php
 * Usage: php rag/ingest.php OR call via web
 */

require_once dirname(__DIR__) . '/config/config.php';
require_once __DIR__ . '/chunk.php';
require_once __DIR__ . '/embed.php';

// Ensure folders exist
if (!is_dir(PROCESSED_PATH)) {
    mkdir(PROCESSED_PATH, 0755, true);
}

echo "[Campus AI] Starting Document & Experience Ingestion...\n";

$allChunks = [];

// 1. Ingest Official Documents
if (is_dir(DOCUMENTS_PATH)) {
    $files = scandir(DOCUMENTS_PATH);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $path = DOCUMENTS_PATH . '/' . $f;
        if (is_file($path)) {
            $content = file_get_contents($path);
            $docChunks = DocumentChunker::chunkFile($f, $content);
            echo "  - Processed {$f}: " . count($docChunks) . " chunks.\n";
            $allChunks = array_merge($allChunks, $docChunks);
        }
    }
}

// 2. Ingest Student Experiences
$expFile = EXPERIENCES_PATH . '/student_experiences.json';
if (file_exists($expFile)) {
    $experiences = json_decode(file_get_contents($expFile), true) ?: [];
    foreach ($experiences as $exp) {
        $allChunks[] = [
            'id' => $exp['id'],
            'title' => $exp['topic'],
            'source' => $exp['source'],
            'page' => 'Student Experience Dataset',
            'type' => 'experience',
            'text' => "Question: {$exp['question']}\nExperience: {$exp['experience']}\nTags: " . implode(', ', $exp['tags'] ?? []),
        ];
    }
    echo "  - Processed Student Experiences: " . count($experiences) . " entries.\n";
}

// 3. Build Global Vocabulary
$vocabSet = [];
foreach ($allChunks as $chunk) {
    $tokens = VectorEngine::tokenize($chunk['text']);
    foreach (array_keys($tokens) as $t) {
        $vocabSet[$t] = true;
    }
}
$vocabulary = array_keys($vocabSet);

// 4. Generate Embeddings / Vectors
$embeddings = [];
foreach ($allChunks as $chunk) {
    $vecData = VectorEngine::createVector($chunk['text'], $vocabulary);
    $embeddings[] = [
        'chunk_id' => $chunk['id'],
        'vector' => $vecData['vector'],
        'norm' => $vecData['norm'],
    ];
}

// 5. Save output
file_put_contents(PROCESSED_PATH . '/chunks.json', json_encode($allChunks, JSON_PRETTY_PRINT));
file_put_contents(PROCESSED_PATH . '/embeddings.json', json_encode([
    'vocabulary' => $vocabulary,
    'embeddings' => $embeddings,
    'indexed_at' => date('Y-m-d H:i:s'),
], JSON_PRETTY_PRINT));

echo "[Campus AI] Ingestion complete! " . count($allChunks) . " chunks indexed in data/processed/\n";
