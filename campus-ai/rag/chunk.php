<?php
/**
 * Campus AI — Document Chunking Module
 * Location: rag/chunk.php
 */

require_once dirname(__DIR__) . '/config/config.php';

class DocumentChunker {
    /**
     * Splits plain text / markdown files into structured chunks with metadata
     */
    public static function chunkFile(string $filename, string $content): array {
        $chunks = [];
        $sections = preg_split('/={20,}|SECTION\s+\d+:/i', $content);
        
        $cleanDocTitle = ucwords(str_replace(['_', '.txt', '.md', '.pdf'], [' ', '', '', ''], $filename));
        $chunkIndex = 1;

        foreach ($sections as $sec) {
            $trimmed = trim($sec);
            if (strlen($trimmed) < 40) {
                continue;
            }

            // Extract page number if present
            $page = "Section " . $chunkIndex;
            if (preg_match('/\[Page\s+(\d+)\]/i', $trimmed, $matches)) {
                $page = "Page " . $matches[1];
            }

            // Extract title
            $title = $cleanDocTitle . " — " . $page;
            if (preg_match('/(?:\d+\.\d+\s+)([^\n\r]+)/', $trimmed, $titleMatches)) {
                $title = trim($titleMatches[1]);
            }

            $chunks[] = [
                'id' => strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $filename)) . '_chunk_' . $chunkIndex++,
                'title' => $title,
                'source' => $cleanDocTitle,
                'page' => $page,
                'type' => 'official',
                'text' => $trimmed,
            ];
        }

        return $chunks;
    }
}
