# Shift Swap - Dataverse Build Prompts

**Purpose:** Step-by-step prompts for Claude Chrome Extension to build Dataverse components  
**Solution Name:** Shift Swap  
**Publisher Prefix:** cp365

---

## How to Use These Prompts

1. Open Power Apps maker portal (make.powerapps.com)
2. Navigate to your environment
3. Use the Claude Chrome extension with each prompt in order
4. Wait for confirmation before proceeding to the next prompt

---

## Phase 1: Solution Setup

### Prompt 1.1 - Create or Verify Solution

```
I need to create Dataverse components for a Shift Swap feature. First, help me verify or create a solution:

**Solution Details:**
- Display Name: Shift Swap
- Name: ShiftSwap
- Publisher: Use existing publisher with prefix "cp365"
- Description: Shift swap and open shift management for CarePoint 365 Rota system

Please guide me through:
1. Checking if this solution already exists
2. If not, creating it with the above details
3. Opening the solution so we can add components

I'm in the Power Apps maker portal. What should I click first?
```

---

## Phase 2: Global Choice Fields (Option Sets)

> **Important:** Create choice fields BEFORE tables, as tables will reference them.

### Prompt 2.1 - Create Swap Request Status Choice

```
I need to create a global choice (option set) in my "Shift Swap" solution in Dataverse.

**Choice Details:**
- Display Name: Swap Request Status
- Name (logical): cp365_swaprequeststatus
- Is Global: Yes (can be reused)
- Description: Status values for shift/visit swap requests

**Values to add (in this exact order):**
| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Awaiting Recipient | Staff initiated, waiting for colleague response |
| 100000001 | Awaiting Manager Approval | Colleague accepted, needs manager approval |
| 100000002 | Approved | Manager approved, swap completed |
| 100000003 | Rejected By Recipient | Colleague declined the swap |
| 100000004 | Rejected By Manager | Manager declined the swap |
| 100000005 | Cancelled | Initiator cancelled the request |
| 100000006 | Expired | Timed out without response |

**Default Value:** 100000000 (Awaiting Recipient)

Guide me step-by-step to create this choice field. I'm in the Shift Swap solution.
```

### Prompt 2.2 - Create Open Shift Offer Status Choice

```
I need to create another global choice in my "Shift Swap" solution.

**Choice Details:**
- Display Name: Open Shift Offer Status
- Name (logical): cp365_openshiftofferstatus
- Is Global: Yes
- Description: Status values for open shift offers sent to staff

**Values to add:**
| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Pending | Awaiting staff response |
| 100000001 | Accepted | Staff accepted the shift |
| 100000002 | Declined | Staff declined the shift |
| 100000003 | Expired | Offer timed out |
| 100000004 | Cancelled | Offer cancelled (e.g., shift filled) |

**Default Value:** 100000000 (Pending)

Guide me to create this choice field.
```

### Prompt 2.3 - Create Notification Scope Choice

```
I need to create another global choice in my "Shift Swap" solution.

**Choice Details:**
- Display Name: Notification Scope
- Name (logical): cp365_notificationscope
- Is Global: Yes
- Description: Determines which staff members receive open shift notifications

**Values to add:**
| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Sublocation | Only staff in the same sublocation |
| 100000001 | Location | All staff in the location |
| 100000002 | All | All eligible staff across the organisation |

**Default Value:** 100000001 (Location)

Guide me to create this choice field.
```

### Prompt 2.4 - Create Assignment Type Choice

```
I need to create another global choice in my "Shift Swap" solution.

**Choice Details:**
- Display Name: Assignment Type
- Name (logical): cp365_assignmenttype
- Is Global: Yes
- Description: Whether the swap is for a residential shift or domiciliary visit

**Values to add:**
| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Shift | Residential care shift |
| 100000001 | Visit | Domiciliary care visit |

**Default Value:** 100000000 (Shift)

Guide me to create this choice field.
```

### Prompt 2.5 - Extend Existing Shift Status (Optional)

```
I need to add two new values to an EXISTING choice field called "cp365_shiftstatus" (if it exists in my environment).

**Values to ADD (do NOT remove existing values):**
| Value | Label | Description |
|-------|-------|-------------|
| 1005 | Open | Shift marked as open, notifications sent |
| 1006 | Filling | Open with pending acceptance |

Help me:
1. First, find if cp365_shiftstatus exists in my environment
2. If it exists, add these two new values
3. If it doesn't exist, let me know and we'll skip this step

Guide me through this process.
```

---

## Phase 3: Create Tables

### Prompt 3.1 - Create Swap Request Table

```
I need to create a new table in my "Shift Swap" solution in Dataverse.

**Table Details:**
- Display Name: Swap Request
- Plural Name: Swap Requests
- Name (logical): cp365_swaprequest
- Description: Stores shift/visit swap requests between staff members
- Table Type: Standard
- Ownership: Organisation
- Enable for Activities: No
- Enable Auditing: Yes
- Enable Change Tracking: Yes

**Primary Column (Name):**
- Display Name: Name
- Name (logical): cp365_name
- Data Type: Auto Number
- Auto-number Format: SR-{SEQNUM:6}
- Example output: SR-000001, SR-000002, etc.

Guide me step-by-step to create this table with the auto-number primary column.
```

### Prompt 3.2 - Create Open Shift Offer Table

```
I need to create another table in my "Shift Swap" solution.

**Table Details:**
- Display Name: Open Shift Offer
- Plural Name: Open Shift Offers
- Name (logical): cp365_openshiftoffer
- Description: Tracks open shift notifications sent to staff and their responses
- Table Type: Standard
- Ownership: Organisation
- Enable for Activities: No
- Enable Auditing: Yes
- Enable Change Tracking: Yes

**Primary Column (Name):**
- Display Name: Name
- Name (logical): cp365_name
- Data Type: Auto Number
- Auto-number Format: OSO-{SEQNUM:8}
- Example output: OSO-00000001, OSO-00000002, etc.

Guide me to create this table.
```

### Prompt 3.3 - Create Rota Swap Configuration Table

```
I need to create a configuration table in my "Shift Swap" solution.

**Table Details:**
- Display Name: Rota Swap Configuration
- Plural Name: Rota Swap Configurations
- Name (logical): cp365_rotaswapconfig
- Description: System-wide configuration for shift swap rules and limits
- Table Type: Standard
- Ownership: Organisation
- Enable for Activities: No
- Enable Auditing: Yes

**Primary Column (Name):**
- Display Name: Name
- Name (logical): cp365_name
- Data Type: Single Line of Text
- Max Length: 100
- Required: Yes

Note: This is NOT an auto-number - it's a regular text field where we'll store values like "Default".

Guide me to create this table.
```

---

## Phase 4: Add Columns to Swap Request Table

### Prompt 4.1 - Add Lookup Columns to Swap Request

```
I need to add lookup columns to my "Swap Request" (cp365_swaprequest) table. These link to existing tables in my environment.

**Lookup Columns to create:**

1. **Request From**
   - Display Name: Request From
   - Name: cp365_requestfrom
   - Related Table: Staff Member (cp365_staffmember)
   - Required: Yes
   - Description: Staff member initiating the swap

2. **Request To**
   - Display Name: Request To
   - Name: cp365_requestto
   - Related Table: Staff Member (cp365_staffmember)
   - Required: Yes
   - Description: Staff member receiving the swap request

3. **Original Shift**
   - Display Name: Original Shift
   - Name: cp365_originalshift
   - Related Table: Shift (cp365_shift)
   - Required: No
   - Description: Initiator's original shift (for residential swaps)

4. **Requested Shift**
   - Display Name: Requested Shift
   - Name: cp365_requestedshift
   - Related Table: Shift (cp365_shift)
   - Required: No
   - Description: Shift being requested from recipient

5. **Original Visit**
   - Display Name: Original Visit
   - Name: cp365_originalvisit
   - Related Table: Visit (cp365_visit)
   - Required: No
   - Description: Initiator's original visit (for domiciliary swaps)

6. **Requested Visit**
   - Display Name: Requested Visit
   - Name: cp365_requestedvisit
   - Related Table: Visit (cp365_visit)
   - Required: No
   - Description: Visit being requested from recipient

7. **Rota**
   - Display Name: Rota
   - Name: cp365_rota
   - Related Table: Rota (cp365_rota)
   - Required: Yes
   - Description: Related rota record

8. **Location**
   - Display Name: Location
   - Name: cp365_location
   - Related Table: Location (cp365_location)
   - Required: Yes
   - Description: Location for filtering

Guide me to add these lookup columns one by one.
```

### Prompt 4.2 - Add Choice Columns to Swap Request

```
I need to add choice columns to my "Swap Request" (cp365_swaprequest) table using the global choices we created earlier.

**Choice Columns to create:**

1. **Assignment Type**
   - Display Name: Assignment Type
   - Name: cp365_assignmenttype
   - Use existing choice: cp365_assignmenttype (global)
   - Required: Yes
   - Default: Shift (100000000)
   - Description: Whether swapping a shift or visit

2. **Request Status**
   - Display Name: Request Status
   - Name: cp365_requeststatus
   - Use existing choice: cp365_swaprequeststatus (global)
   - Required: Yes
   - Default: Awaiting Recipient (100000000)
   - Description: Current status of the swap request

Guide me to add these choice columns.
```

### Prompt 4.3 - Add Text Columns to Swap Request

```
I need to add text columns to my "Swap Request" (cp365_swaprequest) table.

**Text Columns to create:**

1. **Notes From Initiator**
   - Display Name: Notes From Initiator
   - Name: cp365_notesfrominitiator
   - Data Type: Multiple Lines of Text
   - Max Length: 2000
   - Required: No
   - Description: Reason/notes from the staff member requesting the swap

2. **Notes From Recipient**
   - Display Name: Notes From Recipient
   - Name: cp365_notesfromrecipient
   - Data Type: Multiple Lines of Text
   - Max Length: 2000
   - Required: No
   - Description: Response notes from the recipient when accepting/declining

3. **Manager Notes**
   - Display Name: Manager Notes
   - Name: cp365_managernotes
   - Data Type: Multiple Lines of Text
   - Max Length: 2000
   - Required: No
   - Description: Notes from the approving manager

Guide me to add these text columns.
```

### Prompt 4.4 - Add Yes/No Columns to Swap Request

```
I need to add Yes/No (boolean) columns to my "Swap Request" (cp365_swaprequest) table.

**Yes/No Columns to create:**

1. **Advance Notice Breached**
   - Display Name: Advance Notice Breached
   - Name: cp365_advancenoticebreached
   - Default: No
   - Required: No
   - Description: True if swap is within 7 days notice period (urgent)

2. **Initiator Limit Reached**
   - Display Name: Initiator Limit Reached
   - Name: cp365_initiatorlimitreached
   - Default: No
   - Required: No
   - Description: True if initiator has reached monthly swap limit

3. **Recipient Limit Reached**
   - Display Name: Recipient Limit Reached
   - Name: cp365_recipientlimitreached
   - Default: No
   - Required: No
   - Description: True if recipient has reached monthly swap limit

Guide me to add these Yes/No columns.
```

### Prompt 4.5 - Add Date/Time Columns to Swap Request

```
I need to add Date and Time columns to my "Swap Request" (cp365_swaprequest) table.

**Date/Time Columns to create:**

1. **Recipient Responded Date**
   - Display Name: Recipient Responded Date
   - Name: cp365_recipientrespondeddate
   - Data Type: Date and Time
   - Format: Date and Time
   - Required: No
   - Description: When the recipient accepted or declined

2. **Approved Date**
   - Display Name: Approved Date
   - Name: cp365_approveddate
   - Data Type: Date and Time
   - Format: Date and Time
   - Required: No
   - Description: When the manager approved the swap

3. **Completed Date**
   - Display Name: Completed Date
   - Name: cp365_completeddate
   - Data Type: Date and Time
   - Format: Date and Time
   - Required: No
   - Description: When the actual shift assignments were swapped

4. **Expires Date**
   - Display Name: Expires Date
   - Name: cp365_expiresdate
   - Data Type: Date and Time
   - Format: Date and Time
   - Required: No
   - Description: When the request will auto-expire if not responded to

Guide me to add these date/time columns.
```

---

## Phase 5: Add Columns to Open Shift Offer Table

### Prompt 5.1 - Add Lookup Columns to Open Shift Offer

```
I need to add lookup columns to my "Open Shift Offer" (cp365_openshiftoffer) table.

**Lookup Columns to create:**

1. **Shift**
   - Display Name: Shift
   - Name: cp365_shift
   - Related Table: Shift (cp365_shift)
   - Required: No
   - Description: The open shift being offered

2. **Visit**
   - Display Name: Visit
   - Name: cp365_visit
   - Related Table: Visit (cp365_visit)
   - Required: No
   - Description: The open visit being offered (for domiciliary)

3. **Staff Member**
   - Display Name: Staff Member
   - Name: cp365_staffmember
   - Related Table: Staff Member (cp365_staffmember)
   - Required: Yes
   - Description: Staff member receiving the offer

Guide me to add these lookup columns.
```

### Prompt 5.2 - Add Choice Columns to Open Shift Offer

```
I need to add choice columns to my "Open Shift Offer" (cp365_openshiftoffer) table.

**Choice Columns to create:**

1. **Offer Status**
   - Display Name: Offer Status
   - Name: cp365_offerstatus
   - Use existing choice: cp365_openshiftofferstatus (global)
   - Required: Yes
   - Default: Pending (100000000)
   - Description: Current status of the offer

2. **Notification Scope**
   - Display Name: Notification Scope
   - Name: cp365_notificationscope
   - Use existing choice: cp365_notificationscope (global)
   - Required: Yes
   - Default: Location (100000001)
   - Description: Scope used when this offer was created

Guide me to add these choice columns.
```

### Prompt 5.3 - Add Remaining Columns to Open Shift Offer

```
I need to add the remaining columns to my "Open Shift Offer" (cp365_openshiftoffer) table.

**Columns to create:**

1. **Match Score** (Whole Number)
   - Display Name: Match Score
   - Name: cp365_matchscore
   - Data Type: Whole Number
   - Minimum: 0
   - Maximum: 100
   - Required: Yes
   - Description: Calculated match score (0-100)

2. **Score Breakdown** (Multiple Lines of Text)
   - Display Name: Score Breakdown
   - Name: cp365_scorebreakdown
   - Data Type: Multiple Lines of Text
   - Required: No
   - Description: JSON string with detailed score breakdown

3. **Response Notes** (Multiple Lines of Text)
   - Display Name: Response Notes
   - Name: cp365_responsenotes
   - Data Type: Multiple Lines of Text
   - Max Length: 500
   - Required: No
   - Description: Notes from staff when declining

4. **Offered Date** (Date and Time)
   - Display Name: Offered Date
   - Name: cp365_offereddate
   - Data Type: Date and Time
   - Required: Yes
   - Description: When the offer was sent

5. **Responded Date** (Date and Time)
   - Display Name: Responded Date
   - Name: cp365_respondeddate
   - Data Type: Date and Time
   - Required: No
   - Description: When staff responded

6. **Expires At** (Date and Time)
   - Display Name: Expires At
   - Name: cp365_expiresat
   - Data Type: Date and Time
   - Required: Yes
   - Description: When this offer expires

7. **Is Expired** (Yes/No)
   - Display Name: Is Expired
   - Name: cp365_isexpired
   - Default: No
   - Required: Yes
   - Description: True if expired without response

8. **Notification Sent** (Yes/No)
   - Display Name: Notification Sent
   - Name: cp365_notificationsent
   - Default: No
   - Required: Yes
   - Description: Whether push notification was sent

Guide me to add these columns.
```

---

## Phase 6: Add Columns to Configuration Table

### Prompt 6.1 - Add All Configuration Columns

```
I need to add columns to my "Rota Swap Configuration" (cp365_rotaswapconfig) table.

**Whole Number Columns:**

1. **Monthly Limit Per Staff**
   - Display Name: Monthly Limit Per Staff
   - Name: cp365_monthlylimitperstaff
   - Data Type: Whole Number
   - Default: 5
   - Required: Yes
   - Description: Maximum swaps per staff member per month

2. **Advance Notice Days**
   - Display Name: Advance Notice Days
   - Name: cp365_advancenoticedays
   - Data Type: Whole Number
   - Default: 7
   - Required: Yes
   - Description: Days notice for urgent flag

3. **Open Shift Default Expiry**
   - Display Name: Open Shift Default Expiry
   - Name: cp365_openshiftdefaultexpiry
   - Data Type: Whole Number
   - Default: 24
   - Required: Yes
   - Description: Default offer expiry in hours

4. **Open Shift Min Match Score**
   - Display Name: Open Shift Min Match Score
   - Name: cp365_openshiftminmatchscore
   - Data Type: Whole Number
   - Default: 70
   - Required: Yes
   - Description: Minimum match score for notifications

5. **WTD Warning Threshold**
   - Display Name: WTD Warning Threshold
   - Name: cp365_wtdwarningthreshold
   - Data Type: Whole Number
   - Default: 44
   - Required: Yes
   - Description: Working Time Directive warning threshold (hours)

**Yes/No Columns:**

6. **Block Within Notice**
   - Display Name: Block Within Notice
   - Name: cp365_blockwithinnotice
   - Default: No
   - Required: Yes
   - Description: Block swaps within notice period

7. **Requires Manager Approval**
   - Display Name: Requires Manager Approval
   - Name: cp365_requiresmanagerapproval
   - Default: Yes
   - Required: Yes
   - Description: Whether manager approval is required

8. **Notify L1 Manager**
   - Display Name: Notify L1 Manager
   - Name: cp365_notifyl1manager
   - Default: Yes
   - Required: Yes
   - Description: Notify direct manager on approval

9. **Notify L2 Manager**
   - Display Name: Notify L2 Manager
   - Name: cp365_notifyl2manager
   - Default: Yes
   - Required: Yes
   - Description: Notify L2 manager on approval

10. **Notify L3 Manager**
    - Display Name: Notify L3 Manager
    - Name: cp365_notifyl3manager
    - Default: Yes
    - Required: Yes
    - Description: Notify L3 manager on approval

11. **Auto Approve Same Level**
    - Display Name: Auto Approve Same Level
    - Name: cp365_autoapprovesameLevel
    - Default: No
    - Required: Yes
    - Description: Auto-approve swaps between same-level staff

Guide me to add these columns.
```

---

## Phase 7: Create Default Configuration Record

### Prompt 7.1 - Create Default Config Record

```
I need to create the default configuration record in my "Rota Swap Configuration" (cp365_rotaswapconfig) table.

**Record Values:**
- Name: Default
- Monthly Limit Per Staff: 5
- Advance Notice Days: 7
- Block Within Notice: No
- Requires Manager Approval: Yes
- Notify L1 Manager: Yes
- Notify L2 Manager: Yes
- Notify L3 Manager: Yes
- Auto Approve Same Level: No
- Open Shift Default Expiry: 24
- Open Shift Min Match Score: 70
- WTD Warning Threshold: 44

Guide me to:
1. Open the Rota Swap Configuration table
2. Create a new record with these values
3. Save the record

This will be the default configuration used by the application.
```

---

## Phase 8: Verification

### Prompt 8.1 - Verify All Components

```
Help me verify that all Dataverse components for the Shift Swap solution were created correctly.

**Tables to verify:**
- [ ] cp365_swaprequest (Swap Request) - should have 18+ columns
- [ ] cp365_openshiftoffer (Open Shift Offer) - should have 12+ columns
- [ ] cp365_rotaswapconfig (Rota Swap Configuration) - should have 12+ columns

**Global Choices to verify:**
- [ ] cp365_swaprequeststatus - 7 values (100000000-100000006)
- [ ] cp365_openshiftofferstatus - 5 values (100000000-100000004)
- [ ] cp365_notificationscope - 3 values (100000000-100000002)
- [ ] cp365_assignmenttype - 2 values (100000000-100000001)

**Key Column Checks:**
- [ ] Swap Request: Auto-number format SR-{SEQNUM:6}
- [ ] Open Shift Offer: Auto-number format OSO-{SEQNUM:8}
- [ ] All lookup columns resolve to correct related tables
- [ ] Default configuration record exists

Guide me through verifying each of these components.
```

### Prompt 8.2 - Test Create Swap Request

```
Help me test creating a Swap Request record to verify the table is working correctly.

I want to:
1. Open the Swap Request table
2. Create a new test record (I'll fill in the lookups manually)
3. Verify the auto-number generated correctly (should be SR-000001)
4. Verify the default status is "Awaiting Recipient"
5. Delete the test record after verification

Guide me through this test.
```

---

## Summary Checklist

After completing all prompts, verify:

### Tables Created
- [ ] Swap Request (cp365_swaprequest)
- [ ] Open Shift Offer (cp365_openshiftoffer)
- [ ] Rota Swap Configuration (cp365_rotaswapconfig)

### Choice Fields Created
- [ ] Swap Request Status (cp365_swaprequeststatus) - 7 values
- [ ] Open Shift Offer Status (cp365_openshiftofferstatus) - 5 values
- [ ] Notification Scope (cp365_notificationscope) - 3 values
- [ ] Assignment Type (cp365_assignmenttype) - 2 values

### Configuration
- [ ] Default configuration record created

### All in Solution
- [ ] All components added to "Shift Swap" solution

---

*Document created for CarePoint 365 Rota Management System*
