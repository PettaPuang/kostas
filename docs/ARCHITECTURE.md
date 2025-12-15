# KOSTAS Project – Architecture & Development Plan

> **Project Name:** KOSTAS  
> **Description:** Business Management Application for Rental Property (Kost / Kontrakan)  
> **Mindset:** Owner-centric, property-first, simple, scalable  
> **Current Scope:** Phase 1 – Property Builder (LOCKED)

---

## 1. Core Principles

1. Owner-centric system (kontrol di tangan pemilik)
2. Property-first (aset adalah pusat data)
3. Phase-based development (tidak lompat fitur)
4. Schema-driven (database sebagai sumber kebenaran)
5. No overengineering
6. Cursor AI friendly (jelas, konsisten, terbatas scope)

---

## 2. Tech Stack

- **Next.js**: 16.x (App Router)
- **React**: 19.x
- **TypeScript**: 5.x
- **Prisma**: 6.x
- **Database**: PostgreSQL
- **UI**: Shadcn UI + Tailwind CSS

---

## 3. Project Structure

```
app/
├── (auth)/              # Authentication routes
├── (dashboard)/         # Protected owner/staff routes
│   └── [feature]/
│       ├── page.tsx     # Server Component (data fetching)
│       └── ...
├── api/                 # API routes (minimal)
└── generated/prisma/    # Prisma generated client

components/
├── ui/                  # Shadcn UI components
└── [feature]/
    ├── [feature]-client.tsx  # Client Component (state + layout)
    ├── [feature]-list.tsx    # List component
    ├── [feature]-card.tsx    # Card component
    └── [feature]-form.tsx    # Form component

lib/
├── services/            # READ operations (Prisma queries)
├── actions/             # WRITE operations ("use server")
├── validations/         # Zod schemas
└── utils/               # Shared helpers

prisma/
├── schema.prisma        # Database schema (single source of truth)
└── migrations/          # Migration history
```

---

## 4. Architecture Patterns

### 4.1 Server vs Client Components

**Server Component (default):**
- Fetch data using Service
- No state, no interactivity
- Used for data access
- File: `page.tsx`, components without `"use client"`

**Client Component:**
- State management
- Event handlers & forms
- Must include `"use client"`
- File: `*-client.tsx`

**Data Flow:**
```
page.tsx (server)
  → fetch data from Service
  → pass props
  → *-client.tsx
  → *-list.tsx / *-card.tsx
```

### 4.2 Service vs Action Pattern

#### SERVICE (`lib/services/`)
- READ only
- Prisma queries
- Reusable
- Called from Server Components, Actions, API

```ts
export class PropertyService {
  static async findAll() {
    return prisma.property.findMany({
      where: { status: "ACTIVE" },
      include: { rooms: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
```

#### ACTION (`lib/actions/`)
- WRITE only
- Must use `"use server"`
- Used for mutations & form submissions
- Return structured response

```ts
"use server";

export async function createProperty(input: CreatePropertyInput) {
  try {
    const validated = createPropertySchema.parse(input);
    const property = await PropertyService.create(validated);
    return { success: true, message: "Property created", data: property };
  } catch {
    return { success: false, message: "Failed to create property" };
  }
}
```

---

## 5. Type System Rules

- Do NOT duplicate types
- Always infer from Prisma or Service

```ts
export type PropertyWithRooms = Awaited<
  ReturnType<typeof PropertyService.findAll>
>[number];
```

**Note:** Latitude & longitude use Float → no transformation needed for client.

---

## 6. Validation (Zod)

All mutations must use Zod validation.

```ts
import { z } from "zod";

export const createPropertySchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
```

---

## 7. Phase 1 – Property Builder (LOCKED)

### 7.1 Objective

Enable owner/staff to build and manage property data properly.

### 7.2 Included Features

- Create Property
- Set property location (latitude & longitude)
- Create Room under Property
- Define global Facility
- Assign Facility to Room
- View property structure (list & map)

### 7.3 Excluded (Explicitly)

- Tenant
- Contract
- Payment
- Accounting
- Chat
- Notification

---

## 8. Phase 1 – Component Structure

```
components/properties/
├── properties-client.tsx
├── property-list.tsx
├── property-card.tsx
├── property-form.tsx
└── property-map.tsx

components/rooms/
├── room-list.tsx
├── room-card.tsx
└── room-form.tsx

components/facilities/
├── facility-list.tsx
└── facility-checkbox.tsx
```

---

## 9. Prisma Conventions

- Model names: PascalCase
- Field names: camelCase
- Constraints handled in schema
- Minimal audit fields

**Example:**
```prisma
model Room {
  id         String @id @default(cuid())
  propertyId String
  code       String

  @@unique([propertyId, code])
}
```

---

## 10. Database Workflow

### Development
```bash
npm run schema:sync
```

### Production
```bash
npm run db:migrate
```

**package.json scripts:**
```json
{
  "schema:sync": "prisma db push && prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate"
}
```

---

## 11. Critical Rules (NON-NEGOTIABLE)

- NEVER use Prisma or Service in Client Component
- ALWAYS fetch data in Server Component
- ALWAYS infer types
- ALWAYS validate input with Zod
- Service = READ, Action = WRITE
- NO feature outside current phase

---

## 12. Development Phases Plan

### Phase 1 – Property Builder (Current)
- Property
- Room
- Facility
- Map view

### Phase 2 – Tenant & Contract
- Tenant entity
- Contract (DRAFT → ACTIVE)
- Room occupancy status

### Phase 3 – Payment (Manual)
- Payment record
- Upload proof of payment
- Staff verification

### Phase 4 – Accounting (Owner-level)
- COA
- Transaction
- Journal Entry
- Monthly closing

### Phase 5 – Tenant Experience
- Tenant login (limited)
- Public property listing
- Complaint / chat

---

## 13. Cursor AI Usage Guideline

When using Cursor AI:

- Always mention current phase
- Always mention scope limitation
- Always reference this document
- If feature not listed → do not generate

**Example prompt:**
> "Build create property form based on KOSTAS Phase 1. Do not add tenant or payment logic."

---

**Last Updated:** 2025-12-15  
**Status:** Phase 1 Locked
