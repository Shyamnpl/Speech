<?php
// Include the configuration file to load .env variables
require_once __DIR__ . '/config.php';

// Get API key securely from environment variables
$apiKey = getenv('ELEVENLABS_API_KEY');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key not found. Please check your .env configuration.']);
    exit;
}

// Get POST data from the frontend
$requestBody = file_get_contents('php://input');
$requestData = json_decode($requestBody, true);
$textToSpeak = $requestData['text'] ?? '';
$voiceId = $requestData['voice'] ?? 'pNInz6obpgDQGcFmaJgB'; // Default to Adam

if (empty($textToSpeak)) {
    http_response_code(400);
    echo json_encode(['error' => 'Text to speak cannot be empty.']);
    exit;
}

// ElevenLabs API URL
$url = "https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}";

// Data for the API request
$data = [
    'text' => $textToSpeak,
    'model_id' => 'eleven_multilingual_v2',
    'voice_settings' => [
        'stability' => 0.55,
        'similarity_boost' => 0.75,
    ],
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
    echo $response; // Return the error message from ElevenLabs
}
?>