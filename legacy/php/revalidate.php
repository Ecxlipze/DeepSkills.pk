<?php
/**
 * Static-hosting revalidation hook.
 *
 * The admin panel POSTs here after content edits (src/utils/revalidatePublic.js).
 * On the Node deploy this path is served by pages/api/revalidate.js instead and
 * regenerates pages directly. Here we trigger a GitHub Actions rebuild+deploy
 * via repository_dispatch, if a token is configured in the server-side env file
 * (api/.env.local):
 *
 *   GITHUB_DISPATCH_TOKEN=<fine-grained PAT with Contents read/write>
 *   GITHUB_DISPATCH_REPO=Ecxlipze/DeepSkill
 *
 * Always answers {revalidated:true} so admin saves never fail because of this.
 */
header('Content-Type: application/json');

function revalidate_env() {
    $paths = [
        __DIR__ . '/.env',
        __DIR__ . '/.env.local',
        __DIR__ . '/../.env',
        __DIR__ . '/../.env.local',
    ];
    $env = [];
    foreach ($paths as $path) {
        if (!is_readable($path)) continue;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            $pos = strpos($line, '=');
            if ($pos === false) continue;
            $env[trim(substr($line, 0, $pos))] = trim(trim(substr($line, $pos + 1)), "\"'");
        }
    }
    return $env;
}

$env = revalidate_env();
$token = $env['GITHUB_DISPATCH_TOKEN'] ?? '';
$repo = $env['GITHUB_DISPATCH_REPO'] ?? '';

if ($token !== '' && $repo !== '') {
    // Debounce: rapid consecutive saves trigger at most one dispatch per minute
    // (the workflow's concurrency group also cancels superseded builds).
    $stamp = sys_get_temp_dir() . '/deepskills-last-dispatch';
    $last = is_readable($stamp) ? (int) file_get_contents($stamp) : 0;
    if (time() - $last >= 60) {
        @file_put_contents($stamp, (string) time());
        $ch = curl_init("https://api.github.com/repos/{$repo}/dispatches");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['event_type' => 'content-published']),
            CURLOPT_HTTPHEADER => [
                'Accept: application/vnd.github+json',
                "Authorization: Bearer {$token}",
                'User-Agent: deepskills-revalidate-hook',
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}

echo json_encode(['revalidated' => true]);
