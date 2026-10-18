# How Your Community Access Works

This guide explains how the system keeps your community's data secure and ensures that everyone only sees what they are supposed to see.

### 1. The "Two-Community" Scenario (Cross-Tenant Security)
What happens if you are a **Resident** in *Community A*, but you are also an **Admin** in *Community B*? Will the system accidentally give you Admin powers in Community A? 

**No. The system strictly separates your roles.**

```mermaid
flowchart TD
    User([You]) --> |Open App in Community A| App[App checks your identity]
    
    App --> System{System Check:\nWhat is your role in Community A?}
    System -->|You are a Resident| ResidentRole[Role assigned: Resident]
    
    ResidentRole --> TryAdmin[You try to open the Admin Dashboard]
    TryAdmin --> Blocked[❌ Access Denied!\nYou must be an Admin in THIS community.]
    
    style Blocked fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style User fill:#cce5ff,stroke:#0066cc,stroke-width:2px
```

### 2. Live Security Updates (Role Revocation)
What happens if a Security Guard is fired or an Admin is removed, but they are still logged into the app on their phone? Can they still access the system?

**No. The system checks the database in real-time, on every tap.**

```mermaid
flowchart TD
    Manager([Community Manager]) --> |Removes Guard's Access| DB[(Main Database)]
    
    Guard([Fired Guard]) --> |Taps 'Scan Visitor Pass' on their phone| App
    App --> SystemCheck{System Check:\nAre you currently employed?}
    
    DB --> |Status: Fired| SystemCheck
    
    SystemCheck -->|No| Kicked[❌ Access Denied & Logged Out]
    
    style Kicked fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style Manager fill:#d4edda,stroke:#28a745,stroke-width:2px
    style Guard fill:#f8d7da,stroke:#dc3545,stroke-width:2px
```

### 3. Assigning New Roles
How does a Community Manager give someone a new role, and how does the system prevent them from cheating?

```mermaid
flowchart LR
    Manager([Community Manager]) --> |Wants to make a Resident an Admin| Action[Assign Admin Role]
    
    Action --> Rule1{Rule 1: Is Manager an Admin?}
    Rule1 -->|Yes| Rule2{Rule 2: Is the new role allowed?}
    
    Rule2 -->|Yes| Success[✅ Role Updated]
    
    Rule2 -->|Tries to assign 'Platform Owner'| Blocked[❌ Blocked: You cannot assign Global powers.]
    Rule1 -->|No| Blocked2[❌ Blocked: Only Admins can change roles.]
    
    style Success fill:#d4edda,stroke:#28a745,stroke-width:2px
    style Blocked fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style Blocked2 fill:#ffcccc,stroke:#cc0000,stroke-width:2px
```

### Summary of Your Security
* **Your identity is your key:** Your email/phone logs you in, but your *permissions* change completely depending on which community you are currently viewing.
* **Instant Lockout:** If your permissions are revoked, the app instantly blocks you the next time you tap a button.
* **No cheating:** You cannot trick the system into giving you Admin powers, even if you are an Admin somewhere else.
