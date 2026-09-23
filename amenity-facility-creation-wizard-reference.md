# Type-Selection-First Creation Wizard Architecture
## Facility Creation Reference Guide (`/amenities/admin-master`)

> **Screen Reference URL:** `http://localhost:8081/amenities/admin-master`  
> **Parent Console Screen:** [`mobile/mobile-app/app/(resident)/amenities/admin-master.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/amenities/admin-master.tsx)  
> **Wizard Components Folder:** [`mobile/mobile-app/src/features/amenities/components/creation-wizard/`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/amenities/components/creation-wizard/)  
> **Authoritative Design Rule:** [`.agents/rules/mobile-component-catalog.md` (Section VI: Standardized Type-Selection-First Pattern)](file:///e:/atominos/Manage-My-Gate/.agents/rules/mobile-component-catalog.md)  
> **Audience:** UI/UX Designers & Mobile Engineers building multi-type entity creation flows (e.g., Visitor Passes, Amenity Facilities, Service Requests, Incident Tickets).

---

## 1. Executive Summary & The "Type-Selection-First" Pattern

When creating a complex entity that comes in multiple varieties or archetypes (e.g., a *Swimming Pool* vs. a *Tennis Court* vs. a *Banquet Hall* vs. a *Meeting Room* vs. a *Toolkit*), **asking the user to fill out a generic monolithic form creates extreme confusion and validation bloat.**

To solve this, the application enforces the **3-Stage "Type-Selection-First" Creation Flow**:
1. **Stage 1 (Archetype Selection Sheet):** Clicking the primary creation trigger (`+ Add Facility`) opens a dedicated bottom sheet presenting rich cards with icons, badges, hints, and community examples for each archetype.
2. **Stage 2 (Locked-Type Dynamic Wizard):** Tapping an archetype dismisses the sheet and launches the multi-step wizard. The header displays the chosen archetype as a **static, read-only status badge**. Mid-flow type switching is strictly forbidden.
3. **Stage 3 (Dynamic Step & Input Mutation):** Step 3 and Step 4 dynamically change their form fields, chip presets, and validation rules strictly based on the chosen archetype.

---

## 2. Visual Layout Blueprint (Wireframe)

### Stage 1: Archetype Selection Bottom Sheet (`AmenityArchetypeSheet.tsx`)
```
┌───────────────────────────────────────────────────────────┐
│ Select Facility Archetype                             [X] │
│ Choose the archetype to configure booking & capacity rules│
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [👥]  Shared Capacity                    [Headcount]│  │  <-- Archetype 1
│  │       Concurrent headcount pool & resident quotas.  │  │
│  │       e.g. Swimming Pool, Gym, Club Lounge, Deck    │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [⏱️]  Exclusive Hourly             [Slots & Buffer] │  │  <-- Archetype 2
│  │       Court exclusivity with time slots & buffers.  │  │
│  │       e.g. Tennis Court, Badminton, Squash Court    │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [✨]  Event Space                  [Admin Approval] │  │  <-- Archetype 3
│  │       Daily reservations, deposits & approval flow. │  │
│  │       e.g. Banquet Hall, Party Lawn, Clubhouse      │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [🚪]  Room Resource                     [Multi-Room]│  │  <-- Archetype 4
│  │       Sub-rooms with AV equipment & specs.          │  │
│  │       e.g. Meeting Rooms, Co-working Pods, Studio   │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [🔧]  Inventory & Tools             [Stock Checkout]│  │  <-- Archetype 5
│  │       Physical asset checkout & return inspection.  │  │
│  │       e.g. Community Toolkits, Projectors, Ladders  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

### Stage 2 & 3: Locked-Type Dynamic Multi-Step Wizard (`AmenityCreationWizard.tsx`)
```
┌───────────────────────────────────────────────────────────┐
│ [←] Create Amenity Facility       [⏱️ Exclusive Hourly] [X]│  <-- Locked Flow Header
│     Step 3 of 5                                           │      (Read-only Type Badge)
│     Slot & Buffer Setup                                   │
├───────────────────────────────────────────────────────────┤
│  [●]─────────────[●]─────────────[●]─────────────[○]───── │  <-- Step Progress Indicator
│  Info         Schedule         Slots           Pricing    │
├───────────────────────────────────────────────────────────┤
│  STEP 3: DYNAMICALLY MUTATED FORM FIELDS                  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⏱️ Single Slot Duration                             │  │  <-- Multi-Chip Preset Control
│  │    Continuous playtime allocated per reservation.   │  │
│  │    [ 30 min ]  [ 45 min ]  [ 60 min ● ]  [ 90 min ] │  │
│  │    Custom Duration: [ 60               ] minutes    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⏳ Setup & Cleaning Buffer                          │  │  <-- Turnaround Buffer Control
│  │    Automatic downtime between consecutive games.    │  │
│  │    [ None (0) ]  [ 10 min ● ]  [ 15 min ]  [ 30 min]│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📅 Advance Booking Window                           │  │  <-- Advance Notice Control
│  │    How far in advance residents can reserve courts. │  │
│  │    [ 3 Days ]  [ 7 Days ● ]  [ 14 Days ]  [ 30 Days]│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [pb-28 Inset Clearance Zone]                             │
├───────────────────────────────────────────────────────────┤
│  [ Save Draft ]                      [ Back ]   [ Next → ] │  <-- Creation Flow Footer
└───────────────────────────────────────────────────────────┘
```

---

## 3. How Step Definitions & Form Inputs Mutate by Archetype

Every archetype uses 5 steps. Steps 1, 2, and 5 provide consistent baseline data, while **Step 3 and Step 4 dynamically swap their UI component and form validation rules**:

```
                       [ Chosen Archetype ]
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
SHARED_CAPACITY           EXCLUSIVE_HOURLY              EVENT_SPACE
Step 3: Headcount/Quota   Step 3: Slots & Buffers       Step 3: Approval & Notice
Step 4: Free/Hourly       Step 4: Hourly Rate           Step 4: Daily Fee + Deposit
```

### Dynamic Step Orchestration Matrix

| Archetype | Step 1 (Identity) | Step 2 (Schedule) | **Step 3 (Dynamic Form Mutation)** | **Step 4 (Pricing & Policy)** | Step 5 (Review) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SHARED_CAPACITY`** *(Pool, Gym, Lounge)* | Name, Code, Location, Photo, Description | Open/Close times, Active days (Preset: 24/7 or Daytime) | **`SharedCapacityConfigStep`**<br>• Total capacity pool (e.g. 50)<br>• Max guests per booking (1, 2, 4, 6) | Default: `FREE`<br>Guest fee toggle, cancellation policy | `AmenityCreationReviewStep` (Summary verification) |
| **`EXCLUSIVE_HOURLY`** *(Tennis, Squash, Turf)*| Name, Code, Location, Photo, Description | Open/Close times, Active days | **`ExclusiveHourlyConfigStep`**<br>• Single slot duration chips (30, 45, 60, 90m)<br>• Cleaning buffer chips (0, 10, 15, 30m)<br>• Advance booking window (3, 7, 14, 30d) | Default: `HOURLY`<br>Hourly court rate, refund cutoff hours | `AmenityCreationReviewStep` (Summary verification) |
| **`EVENT_SPACE`** *(Banquet Hall, Party Lawn)* | Name, Code, Location, Photo, Description | Open/Close times, Active days | **`EventSpaceConfigStep`**<br>• Maximum guest headcount<br>• Advance notice chips (24h, 48h, 72h, 1 week)<br>• Admin approval toggle (Default: ON) | Default: `DAILY`<br>Daily rate, mandatory security deposit amount | `AmenityCreationReviewStep` (Summary verification) |
| **`ROOM_RESOURCE`** *(Meeting Room, Pods)* | Name, Code, Location, Photo, Description | Open/Close times, Active days | **`RoomResourceConfigStep`**<br>• Multiple sub-rooms list (+ Add Room)<br>• Individual room capacities<br>• AV amenities chips (Wi-Fi, Projector, AC) | Default: `HOURLY`<br>Room hourly fee, deposit policy | `AmenityCreationReviewStep` (Summary verification) |
| **`INVENTORY_TOOLS`** *(Toolkits, Projectors)* | Name, Code, Location, Photo, Description | Open/Close times, Active days | **`InventoryToolsConfigStep`**<br>• Available stock quantity<br>• Max loan hours (2h, 4h, 24h, 3d, 1 week)<br>• Physical return inspection toggle (Default: ON) | Default: `FREE`<br>Replacement security deposit | `AmenityCreationReviewStep` (Summary verification) |

---

## 4. Component Inventory for the Wizard Flow

All components live in `mobile/mobile-app/src/features/amenities/components/creation-wizard/` and strictly reuse the design system catalog:

| Component | File Path | Props & Configuration | Purpose & UX Role |
| :--- | :--- | :--- | :--- |
| **`AmenityArchetypeSheet`** | `AmenityArchetypeSheet.tsx` | `visible`, `selectedArchetype`, `onClose`, `onSelectArchetype` | Stage 1 selection modal. Wraps [`BottomSheet`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/BottomSheet.tsx) and renders rich archetype cards. |
| **`AmenityCreationWizard`** | `AmenityCreationWizard.tsx` | `visible`, `onClose`, `onSubmit`, `onSaveDraft`, `initialArchetype`, `amenity` | Orchestrator container. Manages step indexing, form state, validation guards, and API payload mapping. |
| **`AmenityCreationFlowHeader`**| `AmenityCreationFlowHeader.tsx` | `archetype`, `stepTitle`, `stepSubtitle`, `stepIndex`, `totalSteps`, `onBack`, `onCancel` | Header displaying step progression, back button, cancel trigger, and a **locked, read-only archetype badge**. |
| **`AmenityCreationStepIndicator`**| `AmenityCreationStepIndicator.tsx`| `steps`, `currentIndex` | Horizontal stepped progress bar with animated active indicators. |
| **`AmenityCreationFlowFooter`**| `AmenityCreationFlowFooter.tsx` | `currentStep`, `totalSteps`, `onNext`, `onBack`, `onSaveDraft`, `loading` | Bottom action bar housing *"Save Draft"*, *"Back"*, and *"Next / Publish Facility"* buttons. |
| **`BasicFacilityInfoStep`** | `steps/BasicFacilityInfoStep.tsx` | `form`, `onChange`, `errors` | Step 1 form: Facility name, auto-generated code, category picker, location input, and photo uploader. |
| **`OperatingScheduleStep`** | `steps/OperatingScheduleStep.tsx` | `form`, `onChange`, `errors` | Step 2 form: Open/close time inputs, quick schedule chips (24/7, Daytime, Business), and 7-day day selector. |
| **`SharedCapacityConfigStep`** | `steps/SharedCapacityConfigStep.tsx`| `data`, `onChange`, `errors` | Step 3 form for `SHARED_CAPACITY`: Headcount pool and resident quota chips. |
| **`ExclusiveHourlyConfigStep`**| `steps/ExclusiveHourlyConfigStep.tsx`| `data`, `onChange`, `errors` | Step 3 form for `EXCLUSIVE_HOURLY`: Slot duration chips, buffer chips, and advance window chips. |
| **`EventSpaceConfigStep`** | `steps/EventSpaceConfigStep.tsx` | `data`, `onChange`, `errors` | Step 3 form for `EVENT_SPACE`: Headcount, advance notice chips, approval toggle, and deposit notes. |
| **`RoomResourceConfigStep`** | `steps/RoomResourceConfigStep.tsx` | `data`, `onChange`, `errors` | Step 3 form for `ROOM_RESOURCE`: Sub-room unit list and AV equipment multi-select chips. |
| **`InventoryToolsConfigStep`** | `steps/InventoryToolsConfigStep.tsx`| `data`, `onChange`, `errors` | Step 3 form for `INVENTORY_TOOLS`: Stock quantity, loan duration chips, and return inspection toggle. |
| **`PricingAndPolicyStep`** | `steps/PricingAndPolicyStep.tsx` | `form`, `onChange`, `errors` | Step 4 form: Rate inputs (Hourly/Daily/Free), security deposit field, and cancellation policy sliders. |
| **`AmenityCreationReviewStep`** | `steps/AmenityCreationReviewStep.tsx`| `form`, `onEditStep` | Step 5 form: Read-only summary card verifying all specs with direct "Edit" shortcuts before publishing. |

---

## 5. Architectural Rules Enforced (Design System Rules VI)

### Rule 1: Type Selection Prior to Form Launch (Rule VI.1)
Tapping the primary creation trigger MUST NOT open an empty wizard. It MUST open the dedicated Selection Bottom Sheet first (`AmenityArchetypeSheet`).

### Rule 2: Locked Flow Header & Strict Prohibition on Mid-Flow Type Switching (Rule VI.2)
* **Prohibition:** You MUST NOT place a dropdown chevron (`ChevronDown`) or clickable type switcher in the wizard header.
* **UX Rationale:** Switching types mid-flow destroys in-progress form inputs, mutates the step array length, invalidates step validation logic, and disorients the user. To change type, the user must tap the `X` button and re-select from Stage 1.
* **Code Implementation:**
  ```tsx
  {/* Active Archetype Badge (Read-only status pill) */}
  <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-primary/20 bg-primary/10">
    <IconComp size={13} className="text-primary" />
    <Text className="text-xs font-bold text-primary">{currentMeta.label}</Text>
  </View>
  ```

### Rule 3: Details First, Media at Bottom (Rule VI.3)
Core configuration inputs (Name, Code, Location, Times, Capacity) are always placed at the top of the step scroll view. Heavy media dropzones (`AttachmentPicker`) are positioned at the bottom.

### Rule 4: Auto-Generated System Codes (Rule VI.3)
Users are never forced to invent system codes. The wizard automatically generates codes in the background (`generateFacilityCode('EXCLUSIVE')` -> `FAC-EXCLUSIVE-04`) and displays them inside a clean, pre-filled input.

### Rule 5: Multi-Chip Quick Presets with Custom Override (Rule VI.3)
Numeric and duration settings (e.g. slot duration, turnaround buffers, advance booking window, loan duration) always provide interactive `<Chip>` presets for rapid one-tap selection, paired with an optional `<TextInput keyboardType="numeric">` for custom values.

---

## 6. How UI/UX Designers Can Replicate This for Other Multi-Type Features

If you are designing another feature that supports multiple archetypes or categories (e.g., **Visitor Management**, **Service Requests**, or **Security Tickets**), follow this exact replication template:

### Step 1: Define the Archetypes
Group your entity varieties into 3 to 5 distinct archetypes (e.g. for Visitors: *Guest Visitor*, *Delivery Courier*, *Cab / Taxi*, *Maintenance Contractor*).

### Step 2: Build the Selection Bottom Sheet (`[Feature]ArchetypeSheet.tsx`)
Present each archetype as a touchable card with:
* Distinctive Lucide icon
* Archetype title and category badge
* 1-line operational hint
* Real-world community examples (`e.g. Uber, Swiggy, Plumber`)

### Step 3: Implement Dynamic Step Definitions
Create a step definition dictionary where Step 1 and Step 2 capture common baseline information, and Step 3 swaps form components dynamically based on the chosen archetype (e.g., Deliveries get Company Name & Order ID; Contractors get Pass Validity Dates & Safety Equipment checks).

### Step 4: Enforce the Locked-Type Flow Header
In `[Feature]FlowHeader.tsx`, render the chosen archetype as a **read-only status badge**. Do not add a dropdown menu in the header.

### Step 5: Implement Multi-Chip Presets
For any numeric, duration, or buffer setting, provide 3 to 4 quick-pick chips alongside a custom text input field.
