<?php
/**
 * Campus AI — Global Configuration File
 * Location: config/config.php
 */

// Error reporting (turn off display_errors in production)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Base Path definitions
define('BASE_PATH', dirname(__DIR__));
define('DATA_PATH', BASE_PATH . '/data');
define('DOCUMENTS_PATH', DATA_PATH . '/documents');
define('EXPERIENCES_PATH', DATA_PATH . '/experiences');
define('PROCESSED_PATH', DATA_PATH . '/processed');
define('DB_FILE', BASE_PATH . '/database/campus_ai.sqlite');

// AI and LLM Configuration
// You can provide GEMINI_API_KEY as an environment variable or define it here
define('LLM_API_KEY', getenv('GEMINI_API_KEY') ?: 'YOUR_GEMINI_API_KEY_HERE');
define('LLM_MODEL', 'gemini-3.7-flash');
define('LLM_ENDPOINT', 'https://generativelanguage.googleapis.com/v1beta/models/' . LLM_MODEL . ':generateContent?key=' . LLM_API_KEY);

// RAG Parameters
define('RAG_TOP_OFFICIAL_CHUNKS', 3);
define('RAG_TOP_EXPERIENCES', 2);
define('SIMILARITY_THRESHOLD', 0.08);

// Session Security Settings
define('SESSION_LIFETIME', 86400); // 24 hours
