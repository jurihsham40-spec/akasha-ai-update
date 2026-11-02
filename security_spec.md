# Security Specification — AKASHA AI Client Portal

## 1. Data Invariants
1. **Identity & Admin Authority**: Only verified admins (`abysamaldynkasht@gmail.com` with `email_verified == true` or registered in `/admins/{uid}`) can create/modify systems, publish updates, create client accounts, or view all audit logs.
2. **Per-Account Update & System Isolation**: Clients can only read `/systems/{systemId}` where `resource.data.clientId == request.auth.uid` (or if admin), and `/updates/{updateId}` where `request.auth.uid in resource.data.targetClientIds` (or `'all' in resource.data.targetClientIds` or admin).
3. **PII Isolation**: `/users/{userId}` documents contain client email and company info; only `isOwner(userId)` or `isAdmin()` may read or update a user document. Clients cannot escalate their `role` field.
4. **Support Ticket Ownership**: A support ticket in `/tickets/{ticketId}` can only be read or created by the owning client (`clientId == request.auth.uid`) or an admin.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, attempting to create a document in `/updates/up_malicious`. -> `PERMISSION_DENIED`
2. **Unverified Admin Email Spoof**: `auth = { uid: 'u1', token: { email: 'abysamaldynkasht@gmail.com', email_verified: false } }` writing to `/systems/sys_1`. -> `PERMISSION_DENIED`
3. **Self-Assigned Admin Role**: Client creating `/users/u2` with `role: 'admin'`. -> `PERMISSION_DENIED`
4. **Privilege Escalation Update**: Client updating `/users/u1` changing `role` from `'client'` to `'admin'`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection**: Client creating `/tickets/tkt_1` with an undeclared field `isSuperUrgent: true`. -> `PERMISSION_DENIED`
6. **Cross-Tenant System Read**: Client `usr_client_1` attempting to read `/systems/sys_3` owned by `usr_client_2`. -> `PERMISSION_DENIED`
7. **Cross-Tenant Update Read**: Client `usr_client_1` attempting to read `/updates/up_2` where `targetClientIds` only contains `['usr_client_2']`. -> `PERMISSION_DENIED`
8. **Cross-Tenant Ticket Creation**: Client `u1` creating `/tickets/tkt_99` with `clientId: 'u2'`. -> `PERMISSION_DENIED`
9. **Oversized Payload (Denial of Wallet)**: Client submitting a 10,000-character `subject` in `/tickets/tkt_1`. -> `PERMISSION_DENIED`
10. **Invalid ID Poisoning**: Creating a document with a 200-character ID or invalid characters. -> `PERMISSION_DENIED`
11. **Unauthorized Audit Log Deletion**: Admin or Client attempting to delete `/audit_logs/log_1`. -> `PERMISSION_DENIED`
12. **Blanket User List Scraping**: Non-admin client attempting `list` on `/users` without `userId` filter. -> `PERMISSION_DENIED`
