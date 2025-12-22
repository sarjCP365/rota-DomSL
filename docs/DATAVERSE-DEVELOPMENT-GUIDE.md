# Dataverse Development Guide

A comprehensive guide for building applications with Microsoft Dataverse, based on real-world lessons learned from production implementations.

---

## Table of Contents

1. [Schema Discovery](#1-schema-discovery)
2. [OData API Conventions](#2-odata-api-conventions)
3. [Navigation Properties & Relationships](#3-navigation-properties--relationships)
4. [Creating New Tables & Columns](#4-creating-new-tables--columns)
5. [Common Errors & Solutions](#5-common-errors--solutions)
6. [Best Practices](#6-best-practices)
7. [TypeScript Integration](#7-typescript-integration)

---

## 1. Schema Discovery

### Why Schema Discovery Matters

Dataverse schema names can be **inconsistent** between tables, even within the same solution. Never assume naming conventions - always verify with the actual metadata.

### Method: Query the Metadata API

Create a debug page in your application to fetch and export the schema:

```typescript
// Example: DebugSchema.tsx
const DATAVERSE_URL = import.meta.env.VITE_DATAVERSE_URL;

const TABLES_TO_FETCH = [
  'cp365_shiftpatterntemplatenew',
  'cp365_shiftpatternday',
  'cp365_staffpatternassignment',
  'cp365_shift',
  // Add your tables here
];

async function fetchSchema(token: string) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json',
    'Prefer': 'odata.include-annotations="*"',
  };

  const fetchedEntities = [];

  for (const logicalName of TABLES_TO_FETCH) {
    // Fetch entity metadata
    const entityResponse = await fetch(
      `${DATAVERSE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$select=LogicalName,SchemaName,DisplayName,PrimaryIdAttribute,PrimaryNameAttribute`,
      { headers }
    );
    const entityData = await entityResponse.json();

    // Fetch attribute metadata
    // NOTE: Do NOT include 'Targets' in $select - it only exists on Lookup attributes
    const attributesResponse = await fetch(
      `${DATAVERSE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName,SchemaName,IsPrimaryId,IsPrimaryName,IsCustom`,
      { headers }
    );
    const attributesData = await attributesResponse.json();

    fetchedEntities.push({
      tableName: entityData.LogicalName,
      columns: attributesData.value,
    });
  }

  return fetchedEntities;
}
```

### Key Information to Extract

For each table and column, document:

| Property | Description | Used For |
|----------|-------------|----------|
| `LogicalName` | Lowercase internal name | API queries, filters |
| `SchemaName` | Mixed-case schema name | Navigation properties, `$expand`, `@odata.bind` |
| `AttributeType` | Column type | Data handling |
| `IsPrimaryId` | Is this the primary key? | Record identification |
| `IsCustom` | Custom or system column? | Understanding ownership |

---

## 2. OData API Conventions

### Entity Set Names (Pluralization)

Dataverse pluralizes table names for the API endpoint:

| Table Name | Entity Set Name |
|------------|-----------------|
| `cp365_shift` | `cp365_shifts` |
| `cp365_staffmember` | `cp365_staffmemberses` (note: irregular) |
| `cp365_location` | `cp365_locations` |
| `cp365_shiftpatternday` | `cp365_shiftpatterndays` |

**Rule:** Usually adds `s`, but check the metadata if unsure.

### Field Name Conventions

| Field Type | API Field Name | Example |
|------------|---------------|---------|
| Regular column | Use `LogicalName` | `cp365_name` |
| Lookup value | Prefix with `_` and suffix with `_value` | `_cp365_staffmember_value` |
| Expanded lookup | Use `SchemaName` | `cp365_StaffMember` |

### Case Sensitivity

⚠️ **CRITICAL:** Dataverse is case-sensitive for certain operations!

| Operation | Use | Example |
|-----------|-----|---------|
| `$select` | `LogicalName` (lowercase) | `$select=cp365_name,_cp365_staffmember_value` |
| `$filter` | `LogicalName` (lowercase) | `$filter=cp365_name eq 'Test'` |
| `$expand` | `SchemaName` (varies!) | `$expand=cp365_StaffMember` or `$expand=cp365_staffmember` |
| `@odata.bind` | `SchemaName` (varies!) | `"cp365_StaffMember@odata.bind"` |

---

## 3. Navigation Properties & Relationships

### The Critical Lesson: SchemaName Varies by Table!

**The same lookup field can have different SchemaName casing on different tables:**

```
Table: cp365_staffpatternassignment
  └── cp365_staffmember → SchemaName: "cp365_staffmember" (lowercase)
  └── cp365_shiftpatterntemplate → SchemaName: "cp365_shiftpatterntemplate" (lowercase)

Table: cp365_shift
  └── cp365_staffmember → SchemaName: "cp365_StaffMember" (PascalCase)
  └── cp365_rota → SchemaName: "cp365_Rota" (PascalCase)

Table: cp365_sublocationstaff
  └── cp365_staffmember → SchemaName: "cp365_StaffMember" (PascalCase)
  └── cp365_sublocation → SchemaName: "cp365_Sublocation" (PascalCase)
```

### Using @odata.bind

**Correct approach:**
```typescript
// Use the SchemaName of the navigation property
const payload = {
  cp365_name: "Test Record",
  // For cp365_shift table, use PascalCase:
  "cp365_StaffMember@odata.bind": `/cp365_staffmemberses(${staffMemberId})`,
  "cp365_Rota@odata.bind": `/cp365_rotas(${rotaId})`,
};

// For cp365_staffpatternassignment table, use lowercase:
const assignmentPayload = {
  cp365_name: "Test Assignment",
  "cp365_staffmember@odata.bind": `/cp365_staffmemberses(${staffMemberId})`,
  "cp365_shiftpatterntemplate@odata.bind": `/cp365_shiftpatterntemplatenews(${templateId})`,
};
```

### Using $expand

```typescript
// For cp365_shift - use PascalCase
const shifts = await client.get('cp365_shifts', {
  expand: ['cp365_StaffMember', 'cp365_Rota'],
});
// Access: shift.cp365_StaffMember.cp365_fullname

// For cp365_staffpatternassignment - use lowercase
const assignments = await client.get('cp365_staffpatternassignments', {
  expand: ['cp365_staffmember', 'cp365_shiftpatterntemplate'],
});
// Access: assignment.cp365_staffmember.cp365_fullname
```

### Alternative: Use $ref Endpoint for Associations

When `@odata.bind` causes issues, use the associate endpoint instead:

```typescript
// Step 1: Create record without lookup
const record = await client.create('cp365_shifts', {
  cp365_name: "New Shift",
  cp365_shiftdate: "2025-01-01",
});

// Step 2: Associate using $ref endpoint
await client.associate(
  'cp365_shifts',
  record.cp365_shiftid,
  'cp365_StaffMember', // Navigation property SchemaName
  'cp365_staffmemberses',
  staffMemberId
);
```

This two-step approach is more reliable and avoids "undeclared property" errors.

---

## 4. Creating New Tables & Columns

### Publisher Prefix

Every Dataverse solution has a publisher prefix (e.g., `cp365_`, `cr482_`). 

⚠️ **Warning:** Different publishers may have created columns on the same table!

```
Table: cp365_shift (owned by cp365 publisher)
  ├── cp365_staffmember (cp365 publisher)
  ├── cp365_shiftdate (cp365 publisher)
  └── cr482_sp_isgeneratedfrompattern (cr482 publisher - different!)
```

**Always verify the actual prefix** in the schema export.

### Table Creation Checklist

1. **Display Name:** User-friendly name (e.g., "Shift Pattern Day")
2. **Plural Name:** For the entity set (e.g., "Shift Pattern Days")
3. **Schema Name:** `{prefix}_{tablename}` (e.g., `cp365_shiftpatternday`)
4. **Primary Column:** Usually a name field (auto-created)
5. **Ownership:** User/Team or Organization-owned

### Column Types Reference

| Dataverse Type | OData Type | TypeScript Type | Notes |
|----------------|------------|-----------------|-------|
| Single Line Text | `String` | `string` | Max 4,000 chars |
| Multiple Lines | `Memo` | `string` | For longer text |
| Whole Number | `Integer` | `number` | -2,147,483,648 to 2,147,483,647 |
| Decimal | `Decimal` | `number` | Precision configurable |
| Yes/No | `Boolean` | `boolean` | |
| Date and Time | `DateTime` | `string` (ISO) | Time-only uses dummy date |
| Choice (Picklist) | `Picklist` | `number` | Returns option value |
| Lookup | `Lookup` | `string` (GUID) | Creates relationship |
| Unique Identifier | `Uniqueidentifier` | `string` | Primary key |

### Lookup Column Creation

When creating lookup columns:

1. **Display Name:** "Staff Member"
2. **Schema Name:** `cp365_staffmember`
3. **Related Table:** Select the target table
4. **Relationship Name:** Auto-generated (e.g., `cp365_cp365_staffmember_cp365_shift`)
5. **Delete Behavior:** Choose carefully:
   - **Cascade:** Delete related records
   - **Remove Link:** Set to null
   - **Restrict:** Prevent deletion if related records exist

### Choice Column Values

Dataverse stores choice values as integers, not strings:

```typescript
// Define your choice values
const PatternStatus = {
  Active: 1,
  Inactive: 2,
  Archived: 3,
} as const;

// Query with numeric values
const activePatterns = await client.get('cp365_shiftpatterntemplatenews', {
  filter: 'cp365_sp_patternstatus eq 1',
});
```

### Time-Only Fields

Dataverse doesn't have a true "time-only" type. It uses DateTime with a dummy date:

```typescript
// Dataverse stores as: "1970-01-01T09:00:00Z"
// Extract time only:
const timeStr = record.cp365_sp_starttime; // "1970-01-01T09:00:00Z"
const date = new Date(timeStr);
const hours = date.getUTCHours();
const minutes = date.getUTCMinutes();
```

---

## 5. Common Errors & Solutions

### Error: "Could not find a property named 'X'"

**Cause:** Wrong property name or casing

**Solution:**
1. Check the schema export for exact `LogicalName` and `SchemaName`
2. Verify you're using `SchemaName` for `$expand` and `@odata.bind`
3. Check the publisher prefix is correct

### Error: "An undeclared property 'X' which only has property annotations"

**Cause:** Using `@odata.bind` with wrong format or empty value

**Solution:**
```typescript
// BAD: Property in payload but null/undefined
const payload = {
  "cp365_StaffMember@odata.bind": null, // Causes error!
};

// GOOD: Only include if value exists
const payload: Record<string, any> = { cp365_name: "Test" };
if (staffMemberId) {
  payload["cp365_StaffMember@odata.bind"] = `/cp365_staffmemberses(${staffMemberId})`;
}

// BETTER: Use associate endpoint instead
const record = await client.create('cp365_shifts', { cp365_name: "Test" });
if (staffMemberId) {
  await client.associate('cp365_shifts', record.id, 'cp365_StaffMember', 'cp365_staffmemberses', staffMemberId);
}
```

### Error: "Invalid property 'X' was found in entity"

**Cause:** Column doesn't exist or wrong publisher prefix

**Solution:**
1. Run schema export to verify column exists
2. Check the actual prefix (e.g., `cr482_` vs `cp365_`)
3. Ensure column is published in Dataverse

### Error: Entity set name not found

**Cause:** Wrong pluralization

**Solution:**
```typescript
// Check actual entity set name in metadata
// Some irregular pluralizations:
// - cp365_staffmember → cp365_staffmemberses (not cp365_staffmembers)
// - cp365_shiftpatterntemplatenew → cp365_shiftpatterntemplatenews
```

---

## 6. Best Practices

### 1. Always Export Schema First

Before writing any API code, export the schema and document:
- Exact column names (LogicalName and SchemaName)
- Publisher prefixes
- Relationship navigation property names

### 2. Create a Schema Constants File

```typescript
// src/constants/dataverseSchema.ts
export const SHIFT = {
  entityName: 'cp365_shifts',
  primaryId: 'cp365_shiftid',
  lookups: {
    staffMember: {
      logicalName: 'cp365_staffmember',
      schemaName: 'cp365_StaffMember', // Exact casing!
      valueField: '_cp365_staffmember_value',
    },
  },
} as const;
```

### 3. Validate GUIDs Before API Calls

```typescript
function isValidGuid(value: string | undefined | null): boolean {
  if (!value) return false;
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(value);
}

// Use before @odata.bind
if (isValidGuid(staffMemberId)) {
  payload["cp365_StaffMember@odata.bind"] = `/cp365_staffmemberses(${staffMemberId})`;
}
```

### 4. Use Two-Step Creation for Complex Records

When creating records with multiple lookups:

```typescript
async function createShiftWithAssociations(data: ShiftData) {
  // Step 1: Create basic record
  const shift = await client.create('cp365_shifts', {
    cp365_name: data.name,
    cp365_shiftdate: data.date,
  });

  // Step 2: Associate lookups one by one
  const associations = [
    { nav: 'cp365_StaffMember', entity: 'cp365_staffmemberses', id: data.staffMemberId },
    { nav: 'cp365_Rota', entity: 'cp365_rotas', id: data.rotaId },
  ];

  for (const assoc of associations) {
    if (isValidGuid(assoc.id)) {
      try {
        await client.associate('cp365_shifts', shift.cp365_shiftid, assoc.nav, assoc.entity, assoc.id);
      } catch (error) {
        console.warn(`Failed to associate ${assoc.nav}:`, error);
        // Optionally: try alternative casing
      }
    }
  }

  return shift;
}
```

### 5. Handle Casing Variations

When unsure of casing, try both:

```typescript
async function safeAssociate(sourceEntity: string, sourceId: string, navProperty: string, targetEntity: string, targetId: string) {
  const casings = [navProperty, navProperty.toLowerCase(), toPascalCase(navProperty)];
  
  for (const casing of casings) {
    try {
      await client.associate(sourceEntity, sourceId, casing, targetEntity, targetId);
      return; // Success
    } catch (error) {
      continue; // Try next casing
    }
  }
  throw new Error(`Failed to associate with any casing variant`);
}
```

---

## 7. TypeScript Integration

### Define Interfaces Matching Schema

```typescript
// Match the exact Dataverse column names
interface ShiftPatternTemplate {
  cp365_shiftpatterntemplatenewid: string;
  cp365_name: string;
  cp365_sp_rotationcycleweeks: number;
  cp365_sp_description?: string;
  cp365_sp_patternstatus: number;
  
  // Lookup value fields (from API response)
  _cr482_location_value?: string;
  
  // Expanded lookup objects (when using $expand)
  cr482_Location?: Location;
}

interface StaffPatternAssignment {
  cp365_staffpatternassignmentid: string;
  cp365_name: string;
  cp365_sp_startdate: string;
  cp365_sp_enddate?: string;
  
  // Note: lowercase for this table!
  _cp365_staffmember_value: string;
  _cp365_shiftpatterntemplate_value: string;
  
  // Expanded (also lowercase for this table)
  cp365_staffmember?: StaffMember;
  cp365_shiftpatterntemplate?: ShiftPatternTemplate;
}
```

### Type-Safe Query Builder

```typescript
function buildQuery<T>(options: {
  select?: (keyof T)[];
  filter?: string;
  expand?: string[];
  orderby?: string;
  top?: number;
}) {
  const params: string[] = [];
  
  if (options.select?.length) {
    params.push(`$select=${options.select.join(',')}`);
  }
  if (options.filter) {
    params.push(`$filter=${options.filter}`);
  }
  if (options.expand?.length) {
    params.push(`$expand=${options.expand.join(',')}`);
  }
  if (options.orderby) {
    params.push(`$orderby=${options.orderby}`);
  }
  if (options.top) {
    params.push(`$top=${options.top}`);
  }
  
  return params.length ? `?${params.join('&')}` : '';
}
```

---

## Quick Reference Card

| Task | Use | Example |
|------|-----|---------|
| Select columns | `LogicalName` | `$select=cp365_name,cp365_sp_status` |
| Filter records | `LogicalName` | `$filter=cp365_name eq 'Test'` |
| Expand lookups | `SchemaName` | `$expand=cp365_StaffMember` (check per table!) |
| Set lookup | `SchemaName` | `"cp365_StaffMember@odata.bind": "/.../..."` |
| Read lookup value | `_logicalname_value` | `record._cp365_staffmember_value` |
| Read expanded lookup | `SchemaName` | `record.cp365_StaffMember.cp365_fullname` |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-21 | AI Assistant | Initial version based on production debugging |

---

*This guide is based on lessons learned from real production implementations. Always verify against your specific Dataverse environment.*

