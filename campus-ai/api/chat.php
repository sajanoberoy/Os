<?php
/**
 * Campus AI — Chat API Endpoint
 * Location: api/chat.php
 */

require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/auth/session.php';
require_once dirname(__DIR__) . '/rag/search.php';
require_once dirname(__DIR__) . '/rag/prompt.php';

header('Content-Type: application/json');

// Check authentication
if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Please log in first.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;
$question = trim($data['question'] ?? '');

if (empty($question)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid question.']);
    exit;
}

try {
    // 1. Similarity search
    $retrieval = RAGSearch::findRelevant($question, RAG_TOP_OFFICIAL_CHUNKS, RAG_TOP_EXPERIENCES);

    // 2. Call LLM / Grounded generator
    $result = PromptBuilder::callLLM($question, $retrieval['official'], $retrieval['experience']);

    echo json_encode([
        'success' => true,
        'question' => $question,
        'answer' => $result['answer'],
        'sources' => $result['sources'],
        'model' => $result['model'] ?? 'RAG Engine',
    ]);
} catch (Exception $e) {
    error_log("Chat error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => "Sorry, I couldn't process that question right now.",
    ]);
}
