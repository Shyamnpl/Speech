<?php
// Enable error reporting for debugging on Vercel
ini_set('display_errors', 1);
error_reporting(E_ALL);

// config.php is in the same directory, so this path is correct
require_once __DIR__ . '/config.php';

// Get API key from Vercel Environment Variables
$apiKey = getenv('ELEVENLABS_API_KEY');

if (!$apiKey) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['detail' => ['message' => 'Server Error: API key is not configured in Vercel.']]);
    exit;
}

// Get POST data
$requestBody = file_get_contents('php://input');
$requestData = json_decode($requestBody, true);
$textToSpeak = $requestData['text'] ?? '';
$voiceId = $requestData['voice'] ?? 'pNInz6obpgDQGcFmaJgB';

if (empty($textToSpeak)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['detail' => ['message' => 'Text to speak cannot be empty.']]);
    exit;
}

$url = "https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}";
$data = [
    'text' => $textToSpeak,
    'model_id' => 'eleven_multilingual_v2',
    'voice_settings' => ['stability' => 0.55, 'similarity_boost' => 0.75],
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'xi-api-key: ' . $apiKey,
    'Accept: audio/mpeg',
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode == 200) {
    header('Content-Type: audio/mpeg');
    echo $response;
} else {
    http_response_code($httpcode);
    header('Content-Type: application/json');
    echo $response;
}
?>