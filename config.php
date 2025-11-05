<?php
function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception("The .env file was not found at path: {$path}");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Skip comments
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        // Remove quotes from value
        if (strlen($value) > 1 && $value[0] == '"' && $value[strlen($value) - 1] == '"') {
            $value = substr($value, 1, -1);
        }

        putenv(sprintf('%s=%s', $name, $value));
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

// Load the .env file from the project root
loadEnv(__DIR__ . '/.env');
?>