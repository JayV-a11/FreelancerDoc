# FreelanceDoc — User Guide

## What is FreelanceDoc?

FreelanceDoc is a tool for **freelancers** to create, manage, and send professional **proposals and service contracts**.

If you are a designer, developer, writer, consultant, or any kind of independent professional, FreelanceDoc helps you:

- Create reusable templates for proposals and contracts
- Generate personalized documents for each client
- Send documents by email directly from the platform
- Download documents as PDF
- Track the status of each document (Draft, Sent, Accepted, Rejected, Expired)

---

## Getting started

### 1. Create an account

Go to the registration screen and fill in:

- **Full name**
- **Email** — used to log in
- **Password** — at least 8 characters

After registering, you will be redirected to the dashboard automatically.

### 2. Log in

On the login screen, enter your email and password. If the credentials are correct, you access the dashboard. If you enter the wrong password, an error message is displayed and you can try again.

---

## Screens

### Templates (`/templates`)

Templates are the foundation for creating documents. Think of them as a "standard form" you reuse for different clients.

**What you can do here:**

- View all your saved templates
- Each template shows the name, type (Proposal or Contract), and creation date
- Create a new template by clicking **"New template"**
- Edit an existing template by clicking the pencil icon
- Delete a template by clicking the trash icon (a confirmation will be required)

**Template types:**

| Type | Description |
|------|-------------|
| **Proposal** | Document sent before closing a deal, describing the service and price |
| **Contract** | Formal document that formalizes the agreement after the proposal is accepted |

---

### Create / Edit template (`/templates/new` and `/templates/[id]/edit`)

When creating or editing a template, you fill in:

- **Template name** — e.g. "Web Development Proposal"
- **Type** — Proposal or Contract
- **Content** — the body of the document in block format (headings, paragraphs, prices)

You can use **variables** in the content inside double curly braces, which will be automatically replaced when generating a document:

| Variable | What it represents |
|----------|--------------------|
| `{{project_name}}` | Project name |
| `{{client_name}}` | Client name |
| `{{total_value}}` | Total service value |
| `{{currency}}` | Currency (e.g. BRL, USD) |
| `{{valid_until}}` | Expiry date |

---

### Documents (`/documents`)

Documents are concrete instances generated from a template for a specific client.

**What you can do here:**

- View all created documents
- Filter by status (All, Draft, Sent, Accepted, Rejected, Expired)
- Create a new document by clicking **"New document"**
- Open a document to view details, send it, or download it
- Delete a document (only if it is in Draft status)

**Document statuses:**

| Status | Meaning |
|--------|---------|
| **Draft** | Created but not yet sent to the client. Can be edited. |
| **Sent** | Sent to the client by email. Can no longer be edited. |
| **Accepted** | The client accepted. |
| **Rejected** | The client rejected. |
| **Expired** | The validity period has passed. |

---

### Create new document (`/documents/new`)

To create a document you fill in:

- **Title** — e.g. "Redesign Proposal — Company X"
- **Base template** — choose one of your saved templates (optional)
- **Client name**
- **Client email**
- **Client document** (tax ID — optional)
- **Total value** and **currency**
- **Valid until** — date until which the proposal/contract is valid
- **Content** — the document's text blocks, pre-filled by the template if you selected one

---

### Document detail (`/documents/[id]`)

When you open a document you see:

- All document information (title, client, value, status, validity)
- The full content in blocks
- The version history (every time the document is updated, a new version is saved)

**Available actions:**

| Action | When available |
|--------|---------------|
| **Send by email** | Only when status is Draft |
| **Download PDF** | Always |
| **Change status** | Depends on current status (see table below) |

**Allowed status transitions:**

```
Draft → Sent
Sent  → Accepted / Rejected / Expired
```

When you click **Send**, a dialog opens asking for the recipient's email (can be different from the client's registered email). The system sends the document and automatically changes the status to **Sent**.

---

### Profile (`/profile`)

On this screen you manage your personal and professional information:

**Personal / professional data:**
- Full name
- Professional name (e.g. "Studio XYZ" — appears on documents)
- Tax ID (CPF or CNPJ)
- Phone
- Address

**Change password:**
- Enter your current password
- Enter the new password (at least 8 characters)
- Confirm the new password

---

## Typical workflow

```
1. Register and log in
        ↓
2. Create a template (e.g. "Standard Proposal")
        ↓
3. Create a document from the template for client X
        ↓
4. Review the document content
        ↓
5. Send it by email to the client
        ↓
6. Update the status based on the client's response
   (Accepted or Rejected)
```

---

## Frequently asked questions

**Can I use the same template for multiple clients?**
Yes. A template is reusable. Each client receives a separate document generated from the same template.

**Can I edit a document after sending it?**
No. Once sent, the document is locked from editing to ensure the integrity of the record. If you need changes, create a new document.

**What happens with the version history?**
Every update to a document's content saves a new version. You can view the history on the document detail screen.

**Can I delete a sent document?**
No. Sent documents are permanent records and cannot be deleted.
