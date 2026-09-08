<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['tasks'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for group chats and moderation.'
        ]);
    }
}

$canMutate = ($auth['role'] ?? '') === 'admin' || (($auth['permissions']['tasks'] ?? '') === 'full');
$method = $_SERVER['REQUEST_METHOD'];

// ──────────────────────────────────────────
// GET: Fetch Batches, Stats, and Members
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $batch = $_GET['batch'] ?? '';

        $batchesRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course,time_shift,status&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        $activeBatchName = !empty($batch) ? $batch : (!empty($batches) ? ($batches[0]['batch_name'] ?? '') : '');

        $members = [];
        $mutes = [];
        $totalMessages = 0;

        if (!empty($activeBatchName)) {
            $encodedBatch = rawurlencode($activeBatchName);

            $admissionsRes = otp_supabase_request('GET', "admissions?select=cnic,name,batch,phone,email&batch=eq.{$encodedBatch}&status=in.(Active,Graduated)");
            $admissions = is_array($admissionsRes) ? $admissionsRes : [];

            $mutesRes = otp_supabase_request('GET', "group_chat_mutes?select=*&batch=eq.{$encodedBatch}");
            $mutes = is_array($mutesRes) ? $mutesRes : [];

            $messagesRes = otp_supabase_request('GET', "group_chat_messages?select=id&batch=eq.{$encodedBatch}");
            $totalMessages = is_array($messagesRes) ? count($messagesRes) : 0;

            // Fetch batch record to find instructors
            $batchRow = otp_supabase_request('GET', "batches?select=id&batch_name=eq.{$encodedBatch}&limit=1");
            $batchId = is_array($batchRow) && isset($batchRow[0]['id']) ? $batchRow[0]['id'] : '';

            $instructors = [];
            if (!empty($batchId)) {
                $tbRes = otp_supabase_request('GET', "teacher_batches?select=teachers(cnic,name,phone,email,status)&batch_id=eq.{$batchId}");
                if (is_array($tbRes)) {
                    foreach ($tbRes as $tb) {
                        $t = $tb['teachers'] ?? null;
                        if ($t && ($t['status'] ?? '') === 'Active') {
                            $instructors[] = [
                                'cnic' => $t['cnic'] ?? '',
                                'name' => $t['name'] ?? '',
                                'role' => 'teacher',
                                'batch' => $activeBatchName,
                                'phone' => $t['phone'] ?? null,
                                'email' => $t['email'] ?? null
                            ];
                        }
                    }
                }
            }

            $students = [];
            foreach ($admissions as $s) {
                $students[] = [
                    'cnic' => $s['cnic'] ?? '',
                    'name' => $s['name'] ?? '',
                    'role' => 'student',
                    'batch' => $s['batch'] ?? $activeBatchName,
                    'phone' => $s['phone'] ?? null,
                    'email' => $s['email'] ?? null
                ];
            }

            $members = array_merge($instructors, $students);
        }

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'batches' => $batches,
                'activeBatch' => $activeBatchName,
                'stats' => [
                    'totalBatches' => count($batches),
                    'channelMembers' => count($members),
                    'channelMutes' => count($mutes),
                    'channelMessages' => $totalMessages
                ],
                'members' => $members,
                'mutes' => $mutes
            ]
        ]);
    } catch (Exception $e) {
        otp_respond(500, [
            'status' => 'error',
            'message' => $e->getMessage() ?: 'Failed to fetch group chat metadata.'
        ]);
    }
}

// ──────────────────────────────────────────
// POST: Moderation Dispatcher
// ──────────────────────────────────────────
if ($method === 'POST') {
    if (!$canMutate) {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Modification permissions required.'
        ]);
    }

    $input = otp_read_json_body();
    $action = $input['action'] ?? '';
    $batch = $input['batch'] ?? '';
    $studentCnic = $input['student_cnic'] ?? '';
    $studentName = $input['student_name'] ?? 'Student';
    $moderatorName = $auth['name'] ?? 'Administrator';

    if (empty($batch)) {
        otp_respond(400, ['status' => 'error', 'message' => 'Batch is required.']);
    }

    try {
        if ($action === 'mute_student') {
            if (empty($studentCnic)) {
                otp_respond(400, ['status' => 'error', 'message' => 'student_cnic is required.']);
            }

            otp_supabase_request('POST', 'group_chat_mutes', [
                'batch' => $batch,
                'user_cnic' => $studentCnic,
                'muted_by' => $moderatorName
            ]);

            otp_supabase_request('POST', 'group_chat_messages', [
                'batch' => $batch,
                'sender_cnic' => 'SYSTEM',
                'sender_name' => 'Moderation System',
                'sender_role' => 'system',
                'type' => 'system',
                'text' => "{$studentName} has been muted by administration.",
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            otp_supabase_request('POST', 'group_chat_messages', [
                'batch' => $batch,
                'sender_cnic' => 'SYSTEM',
                'sender_name' => 'Moderation System',
                'sender_role' => 'system',
                'type' => 'warning',
                'text' => "You have been muted by Administration ({$moderatorName}). You cannot send messages until unmuted.",
                'target_cnic' => $studentCnic,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            otp_respond(200, ['status' => 'success', 'message' => "{$studentName} successfully muted."]);
        }

        if ($action === 'unmute_student') {
            if (empty($studentCnic)) {
                otp_respond(400, ['status' => 'error', 'message' => 'student_cnic is required.']);
            }

            $encodedBatch = rawurlencode($batch);
            $encodedCnic = rawurlencode($studentCnic);

            otp_supabase_request('DELETE', "group_chat_mutes?batch=eq.{$encodedBatch}&user_cnic=eq.{$encodedCnic}");

            otp_supabase_request('POST', 'group_chat_messages', [
                'batch' => $batch,
                'sender_cnic' => 'SYSTEM',
                'sender_name' => 'Moderation System',
                'sender_role' => 'system',
                'type' => 'system',
                'text' => "{$studentName} has been unmuted by administration.",
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            otp_respond(200, ['status' => 'success', 'message' => "{$studentName} successfully unmuted."]);
        }

        if ($action === 'broadcast_system_message') {
            $text = trim($input['text'] ?? '');
            if (empty($text)) {
                otp_respond(400, ['status' => 'error', 'message' => 'Text is required.']);
            }

            $created = otp_supabase_request('POST', 'group_chat_messages', [
                'batch' => $batch,
                'sender_cnic' => 'ADMIN',
                'sender_name' => $moderatorName,
                'sender_role' => 'admin',
                'type' => 'text',
                'text' => $text,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ], ['Prefer: return=representation']);

            otp_respond(200, [
                'status' => 'success',
                'message' => 'System dispatch broadcasted to batch channel.',
                'data' => is_array($created) && isset($created[0]) ? $created[0] : $created
            ]);
        }

        if ($action === 'delete_message') {
            $messageId = $input['message_id'] ?? '';
            if (empty($messageId)) {
                otp_respond(400, ['status' => 'error', 'message' => 'message_id is required.']);
            }

            otp_supabase_request('DELETE', "group_chat_messages?id=eq.{$messageId}");

            otp_respond(200, ['status' => 'success', 'message' => 'Message removed by administrator.']);
        }

        otp_respond(400, ['status' => 'error', 'message' => "Unknown action: {$action}"]);
    } catch (Exception $e) {
        otp_respond(500, [
            'status' => 'error',
            'message' => $e->getMessage() ?: 'Operation failed.'
        ]);
    }
}
