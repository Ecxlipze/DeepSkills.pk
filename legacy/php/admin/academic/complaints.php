<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['complaints'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for student complaints and grievances.'
        ]);
    }
}

$canMutate = ($auth['role'] ?? '') === 'admin' || (($auth['permissions']['complaints'] ?? '') === 'full');
$method = $_SERVER['REQUEST_METHOD'];

// ──────────────────────────────────────────
// GET: Fetch Tickets, Telemetry, and Metadata
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $search = trim($_GET['search'] ?? '');
        $status = $_GET['status'] ?? '';
        $category = $_GET['category'] ?? '';
        $batch = $_GET['batch'] ?? '';
        $priority = $_GET['priority'] ?? '';

        // 1. Fetch metadata
        $batchesRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course,time_shift,status&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        $coursesRes = otp_supabase_request('GET', 'courses?select=id,title&order=title.asc');
        $courses = is_array($coursesRes) ? $coursesRes : [];

        $admRes = otp_supabase_request('GET', 'admissions?select=id,name,cnic,phone,email,course,batch,status&status=in.(Active,Graduated)');
        $admissions = is_array($admRes) ? $admRes : [];

        $studentMap = [];
        foreach ($admissions as $adm) {
            $cnic = $adm['cnic'] ?? '';
            if (!empty($cnic)) {
                $studentMap[$cnic] = $adm;
            }
        }

        // 2. Fetch complaints with messages
        $rawComplaintsRes = otp_supabase_request('GET', 'complaints?select=*,messages:complaint_messages(*)&order=updated_at.desc');
        $rawComplaints = is_array($rawComplaintsRes) ? $rawComplaintsRes : [];

        // 3. Enrich complaints
        $enriched = [];
        foreach ($rawComplaints as $c) {
            $msgs = $c['messages'] ?? [];
            if (is_array($msgs)) {
                usort($msgs, function($a, $b) {
                    return strtotime($a['created_at'] ?? '0') - strtotime($b['created_at'] ?? '0');
                });
            } else {
                $msgs = [];
            }

            $lastMsg = !empty($msgs) ? $msgs[count($msgs) - 1] : null;
            $cnic = $c['student_cnic'] ?? '';
            $st = $studentMap[$cnic] ?? [];

            $enriched[] = array_merge($c, [
                'messages' => $msgs,
                'message_count' => count($msgs),
                'last_message' => $lastMsg ? [
                    'text' => $lastMsg['text'] ?? '',
                    'sender_name' => $lastMsg['sender_name'] ?? '',
                    'sender_role' => $lastMsg['sender_role'] ?? '',
                    'created_at' => $lastMsg['created_at'] ?? ''
                ] : null,
                'student_phone' => $st['phone'] ?? null,
                'student_email' => $st['email'] ?? null,
                'student_status' => $st['status'] ?? null
            ]);
        }

        // 4. Calculate Stats over full list
        $totalTickets = count($enriched);
        $openCount = 0;
        $pendingReplyCount = 0;
        $closedCount = 0;
        $urgentCount = 0;

        foreach ($enriched as $item) {
            $stName = $item['status'] ?? 'Open';
            $pName = $item['priority'] ?? 'Normal';
            if ($stName === 'Open') $openCount++;
            if ($stName === 'Pending Reply') $pendingReplyCount++;
            if ($stName === 'Closed') $closedCount++;
            if ($pName === 'Urgent') $urgentCount++;
        }

        $resolutionRate = $totalTickets > 0 ? (int)round(($closedCount / $totalTickets) * 100) : 100;

        // 5. Apply filters
        if (!empty($search)) {
            $q = strtolower($search);
            $enriched = array_filter($enriched, function($item) use ($q) {
                return str_contains(strtolower($item['student_name'] ?? ''), $q) ||
                       str_contains(strtolower($item['student_cnic'] ?? ''), $q) ||
                       str_contains(strtolower($item['subject'] ?? ''), $q) ||
                       str_contains(strtolower($item['course'] ?? ''), $q) ||
                       str_contains(strtolower($item['batch'] ?? ''), $q);
            });
            $enriched = array_values($enriched);
        }

        if (!empty($status) && $status !== 'All') {
            $enriched = array_filter($enriched, function($item) use ($status) {
                return ($item['status'] ?? '') === $status;
            });
            $enriched = array_values($enriched);
        }

        if (!empty($category) && $category !== 'All') {
            $enriched = array_filter($enriched, function($item) use ($category) {
                return ($item['category'] ?? 'Academic') === $category;
            });
            $enriched = array_values($enriched);
        }

        if (!empty($batch) && $batch !== 'All') {
            $enriched = array_filter($enriched, function($item) use ($batch) {
                return ($item['batch'] ?? '') === $batch;
            });
            $enriched = array_values($enriched);
        }

        if (!empty($priority) && $priority !== 'All') {
            $enriched = array_filter($enriched, function($item) use ($priority) {
                return ($item['priority'] ?? 'Normal') === $priority;
            });
            $enriched = array_values($enriched);
        }

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'complaints' => $enriched,
                'stats' => [
                    'total' => $totalTickets,
                    'open' => $openCount,
                    'pending_reply' => $pendingReplyCount,
                    'closed' => $closedCount,
                    'urgent' => $urgentCount,
                    'resolved' => $closedCount,
                    'resolution_rate' => $resolutionRate
                ],
                'meta' => [
                    'batches' => $batches,
                    'courses' => $courses,
                    'categories' => ['Academic', 'Technical', 'Administration', 'Facilities', 'Examination', 'Other']
                ]
            ]
        ]);
    } catch (Exception $e) {
        otp_respond(500, [
            'status' => 'error',
            'message' => $e->getMessage() ?: 'Failed to load grievance tickets.'
        ]);
    }
}

// ──────────────────────────────────────────
// POST: Ticket Actions Dispatcher
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
    $adminName = $auth['name'] ?? 'Academic Administrator';

    try {
        // ── Action 1: Send Message ──
        if ($action === 'send_message') {
            $complaintId = $input['complaint_id'] ?? '';
            $text = trim($input['text'] ?? '');

            if (empty($complaintId) || empty($text)) {
                otp_respond(400, ['status' => 'error', 'message' => 'complaint_id and text are required.']);
            }

            // Insert message
            $msgRecord = [
                'complaint_id' => $complaintId,
                'sender_role' => 'admin',
                'sender_name' => $adminName,
                'text' => $text,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ];
            $newMsg = otp_supabase_request('POST', 'complaint_messages', $msgRecord, ['Prefer: return=representation']);

            // Update ticket
            otp_supabase_request('PATCH', "complaints?id=eq.{$complaintId}", [
                'status' => 'Pending Reply',
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            otp_respond(200, [
                'status' => 'success',
                'message' => 'Reply sent successfully.',
                'data' => is_array($newMsg) && isset($newMsg[0]) ? $newMsg[0] : $newMsg
            ]);
        }

        // ── Action 2: Resolve Ticket ──
        if ($action === 'resolve') {
            $complaintId = $input['complaint_id'] ?? '';
            $note = trim($input['resolution_note'] ?? '');

            if (empty($complaintId)) {
                otp_respond(400, ['status' => 'error', 'message' => 'complaint_id is required.']);
            }

            $resText = !empty($note)
                ? $note
                : 'Administrative Notice: This grievance has been marked as resolved by administration. Please reopen if you require further assistance.';

            otp_supabase_request('POST', 'complaint_messages', [
                'complaint_id' => $complaintId,
                'sender_role' => 'admin',
                'sender_name' => $adminName,
                'text' => $resText,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            $updated = otp_supabase_request('PATCH', "complaints?id=eq.{$complaintId}", [
                'status' => 'Closed',
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z')
            ], ['Prefer: return=representation']);

            otp_respond(200, [
                'status' => 'success',
                'message' => 'Ticket successfully marked as resolved.',
                'data' => is_array($updated) && isset($updated[0]) ? $updated[0] : $updated
            ]);
        }

        // ── Action 3: Reopen Ticket ──
        if ($action === 'reopen') {
            $complaintId = $input['complaint_id'] ?? '';
            if (empty($complaintId)) {
                otp_respond(400, ['status' => 'error', 'message' => 'complaint_id is required.']);
            }

            otp_supabase_request('POST', 'complaint_messages', [
                'complaint_id' => $complaintId,
                'sender_role' => 'admin',
                'sender_name' => $adminName,
                'text' => 'Administrative Notice: This ticket has been reopened for further investigation.',
                'created_at' => gmdate('Y-m-d\TH:i:s\Z')
            ]);

            $updated = otp_supabase_request('PATCH', "complaints?id=eq.{$complaintId}", [
                'status' => 'Open',
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z')
            ], ['Prefer: return=representation']);

            otp_respond(200, [
                'status' => 'success',
                'message' => 'Ticket reopened successfully.',
                'data' => is_array($updated) && isset($updated[0]) ? $updated[0] : $updated
            ]);
        }

        // ── Action 4: Toggle Urgent ──
        if ($action === 'toggle_urgent') {
            $complaintId = $input['complaint_id'] ?? '';
            $currentPriority = $input['current_priority'] ?? 'Normal';
            if (empty($complaintId)) {
                otp_respond(400, ['status' => 'error', 'message' => 'complaint_id is required.']);
            }

            $newPriority = $currentPriority === 'Urgent' ? 'Normal' : 'Urgent';

            $updated = otp_supabase_request('PATCH', "complaints?id=eq.{$complaintId}", [
                'priority' => $newPriority,
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z')
            ], ['Prefer: return=representation']);

            otp_respond(200, [
                'status' => 'success',
                'message' => "Ticket priority updated to {$newPriority}.",
                'data' => is_array($updated) && isset($updated[0]) ? $updated[0] : $updated
            ]);
        }

        // ── Action 5: Create Administrative Ticket ──
        if ($action === 'create_ticket') {
            $subject = trim($input['subject'] ?? '');
            if (empty($subject)) {
                otp_respond(400, ['status' => 'error', 'message' => 'Subject is required.']);
            }

            $ticketRecord = [
                'student_name' => $input['student_name'] ?? 'Administrative Entry',
                'student_cnic' => $input['student_cnic'] ?? null,
                'course' => $input['course'] ?? 'General',
                'batch' => $input['batch'] ?? 'All Batches',
                'subject' => $subject,
                'category' => $input['category'] ?? 'Academic',
                'status' => 'Open',
                'priority' => ($input['priority'] ?? '') === 'Urgent' ? 'Urgent' : 'Normal',
                'send_to' => 'Admin',
                'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z')
            ];

            $created = otp_supabase_request('POST', 'complaints', $ticketRecord, ['Prefer: return=representation']);
            $ticketData = is_array($created) && isset($created[0]) ? $created[0] : $created;
            $newId = $ticketData['id'] ?? '';

            if (!empty($newId)) {
                $initMsg = trim($input['initial_message'] ?? '');
                $msgText = !empty($initMsg) ? $initMsg : "Administrative ticket logged by {$adminName}.";

                otp_supabase_request('POST', 'complaint_messages', [
                    'complaint_id' => $newId,
                    'sender_role' => 'admin',
                    'sender_name' => $adminName,
                    'text' => $msgText,
                    'created_at' => gmdate('Y-m-d\TH:i:s\Z')
                ]);
            }

            otp_respond(201, [
                'status' => 'success',
                'message' => 'Grievance ticket created successfully.',
                'data' => $ticketData
            ]);
        }

        otp_respond(400, ['status' => 'error', 'message' => "Unknown action: {$action}"]);
    } catch (Exception $e) {
        otp_respond(500, [
            'status' => 'error',
            'message' => $e->getMessage() ?: 'Operation failed.'
        ]);
    }
}
