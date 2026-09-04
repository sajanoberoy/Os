<?php
/**
 * Campus AI — LLM Prompt Builder & Generation Engine
 * Location: rag/prompt.php
 */

require_once dirname(__DIR__) . '/config/config.php';

class PromptBuilder {
    public static function buildPrompt(string $question, array $officialChunks, array $experienceChunks): array {
        $officialText = "NO_OFFICIAL_DOCUMENTS_FOUND";
        if (!empty($officialChunks)) {
            $parts = [];
            foreach ($officialChunks as $item) {
                $c = $item['chunk'];
                $parts[] = "[DOCUMENT: {$c['source']} | {$c['page']}]\n{$c['text']}";
            }
            $officialText = implode("\n\n", $parts);
        }

        $experienceText = "NO_STUDENT_EXPERIENCES_FOUND";
        if (!empty($experienceChunks)) {
            $parts = [];
            foreach ($experienceChunks as $item) {
                $c = $item['chunk'];
                $parts[] = "[EXPERIENCE: {$c['title']}]\n{$c['text']}";
            }
            $experienceText = implode("\n\n", $parts);
        }

        $systemInstruction = "You are Campus AI, an intelligent university assistant for college students.
Your core mission is to provide truthful, grounded campus guidance by strictly separating OFFICIAL UNIVERSITY POLICY from CURATED STUDENT EXPERIENCES.

CRITICAL RULES:
1. Grounding: Answer strictly using the provided context. Never invent office locations, fees, or rules.
2. Distinct Sections:
   - OFFICIAL UNIVERSITY INFORMATION: Quote or clearly summarize official university rules and cite the document/page.
   - STUDENT PRACTICAL EXPERIENCE: Practical advice from senior students (timings, lines, desk tips). Always include a brief reminder that student reports should be verified with the university.
   - ACTIONABLE NEXT STEPS: 2-3 concise checklist items.
3. If no official source exists, explicitly state: 'I couldn't find an official university source for this information.'";

        $userPrompt = "USER QUESTION: \"{$question}\"\n\n"
            . "==================================================\n"
            . "RETRIEVED OFFICIAL UNIVERSITY CONTEXT:\n{$officialText}\n\n"
            . "==================================================\n"
            . "RETRIEVED STUDENT EXPERIENCES CONTEXT:\n{$experienceText}\n\n"
            . "==================================================\n"
            . "INSTRUCTIONS: Provide a clear, structured answer distinguishing official policies from student practical experiences.";

        return [
            'system' => $systemInstruction,
            'user' => $userPrompt,
        ];
    }

    public static function callLLM(string $question, array $officialChunks, array $experienceChunks): array {
        $prompts = self::buildPrompt($question, $officialChunks, $experienceChunks);
        $apiKey = LLM_API_KEY;

        // Collect sources
        $sources = [];
        foreach ($officialChunks as $item) {
            $c = $item['chunk'];
            $sources[] = [
                'title' => $c['source'],
                'page' => $c['page'],
                'type' => 'official',
                'snippet' => substr($c['text'], 0, 150) . '...',
            ];
        }
        foreach ($experienceChunks as $item) {
            $c = $item['chunk'];
            $sources[] = [
                'title' => $c['source'],
                'page' => 'Student Experience Dataset',
                'type' => 'experience',
                'snippet' => substr($c['text'], 0, 150) . '...',
            ];
        }

        // Try Gemini API if API key is provided
        if (!empty($apiKey) && $apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            $url = LLM_ENDPOINT;
            $payload = [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [['text' => $prompts['user']]]
                    ]
                ],
                'systemInstruction' => [
                    'parts' => [['text' => $prompts['system']]]
                ],
                'generationConfig' => [
                    'temperature' => 0.2,
                ]
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $resData = json_decode($response, true);
                $generatedText = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
                if (!empty($generatedText)) {
                    return [
                        'success' => true,
                        'answer' => $generatedText,
                        'sources' => $sources,
                        'model' => LLM_MODEL,
                    ];
                }
            }
        }

        // Fallback grounded answer assembly (Deterministic RAG)
        $officialText = !empty($officialChunks)
            ? "According to {$officialChunks[0]['chunk']['source']} ({$officialChunks[0]['chunk']['page']}):\n" . substr($officialChunks[0]['chunk']['text'], 0, 300) . "..."
            : "I couldn't find an official university document for this query.";

        $expText = !empty($experienceChunks)
            ? "Based on student community reports:\n" . substr($experienceChunks[0]['chunk']['text'], 0, 300) . "...\n\n(Please verify student experiences with your department)."
            : "No student experience reports found.";

        $fallbackAnswer = "### OFFICIAL UNIVERSITY INFORMATION\n{$officialText}\n\n### STUDENT PRACTICAL EXPERIENCE\n{$expText}";

        return [
            'success' => true,
            'answer' => $fallbackAnswer,
            'sources' => $sources,
            'model' => 'Local Grounded RAG Engine',
        ];
    }
}
