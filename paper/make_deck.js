/* Generates the PlaceMate project presentation (.pptx) for a professor review. */
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";           // 13.333 x 7.5
pptx.author = "Tushar Kumar";
pptx.title = "PlaceMate — Placement Cell Management System";
pptx.subject = "BCA Major Project Presentation";

// ---------------------------------------------------------------- palette
// Pulled from the application's own design tokens (dark stage greens).
const BG      = "0B1814";
const CARD    = "132A20";
const CARD_HI = "173328";
const HAIR    = "274A3C";
const WHITE   = "FFFFFF";
const MUTED   = "A8BDB2";
const GREEN   = "22C55E";
const LIME    = "D3EF4C";
const AMBER   = "D9A13B";
const CORAL   = "F87171";

const HEAD = "Cambria";
const BODY = "Calibri";

const M      = 0.62;                   // page margin
const CW     = 13.333 - M * 2;         // content width
const TOP    = 1.52;                   // content top

const shadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 90, opacity: 0.38 });

let pageNo = 0;

// ---------------------------------------------------------------- helpers
function base({ kicker, title, sub }) {
  pageNo += 1;
  const s = pptx.addSlide();
  s.background = { color: BG };
  s.addText(kicker, {
    x: M, y: 0.36, w: CW, h: 0.26, margin: 0, fontFace: BODY, fontSize: 11.5,
    bold: true, color: LIME, charSpacing: 2.4,
  });
  s.addText(title, {
    x: M, y: 0.62, w: CW, h: 0.66, margin: 0, fontFace: HEAD, fontSize: 31,
    bold: true, color: WHITE,
  });
  if (sub) {
    s.addText(sub, {
      x: M, y: 1.2, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13.5, color: MUTED,
    });
  }
  // quiet footer
  s.addText("PlaceMate  ·  Tushar Kumar  ·  BCA", {
    x: M, y: 7.03, w: 8, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: "5C7A6B",
  });
  s.addText(String(pageNo), {
    x: 13.333 - M - 1.2, y: 7.03, w: 1.2, h: 0.26, margin: 0,
    fontFace: BODY, fontSize: 10, color: "5C7A6B", align: "right",
  });
  return s;
}

function card(s, x, y, w, h, fill = CARD) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: fill }, line: { color: HAIR, width: 0.75 },
    rectRadius: 0.1, shadow: shadow(),
  });
}

function bullets(items, opts = {}) {
  return items.map((t, i) => ({
    text: t,
    options: {
      bullet: { characterCode: "25CF" },
      breakLine: true,
      fontFace: BODY, fontSize: opts.size || 14, color: opts.color || WHITE,
      paraSpaceAfter: opts.gap === undefined ? 7 : opts.gap,
      ...(opts.lineSpacing ? { lineSpacing: opts.lineSpacing } : {}),
    },
  }));
}

// icon circle with a short glyph
function glyph(s, x, y, d, label, { fill = GREEN, fg = "06281A", size = 15 } = {}) {
  s.addShape(pptx.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 },
  });
  s.addText(label, {
    x, y: y + d / 2 - 0.16, w: d, h: 0.32, margin: 0, align: "center",
    fontFace: BODY, fontSize: size, bold: true, color: fg,
  });
}

function stat(s, x, y, w, h, value, label, { color = LIME, vsize = 40 } = {}) {
  card(s, x, y, w, h);
  s.addText(value, {
    x: x + 0.24, y: y + 0.16, w: w - 0.48, h: 0.64, margin: 0,
    fontFace: HEAD, fontSize: vsize, bold: true, color,
  });
  s.addText(label, {
    x: x + 0.24, y: y + h - 0.68, w: w - 0.48, h: 0.52, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 13.5,
  });
}

function miniTable(s, x, y, w, head, rows, widths) {
  const body = [
    head.map((t) => ({ text: t, options: { bold: true, color: BG, fill: { color: LIME }, fontSize: 12 } })),
    ...rows.map((r, ri) =>
      r.map((t, ci) => ({
        text: t,
        options: {
          fontSize: 11.5, color: WHITE,
          fill: { color: ri % 2 === 0 ? CARD : CARD_HI },
          align: ci === 0 ? "left" : "center",
        },
      }))
    ),
  ];
  s.addTable(body, {
    x, y, w, colW: widths, border: { pt: 0.5, color: HAIR },
    margin: 0.07, rowH: 0.3, valign: "middle",
  });
}

// ================================================================ 1. TITLE
{
  pageNo += 1;
  const s = pptx.addSlide();
  s.background = { color: BG };
  // soft depth blobs, echoing the app backdrop
  s.addShape(pptx.ShapeType.ellipse, { x: 8.4, y: -2.4, w: 7.4, h: 7.4, fill: { color: "1D4B36" }, line: { color: "1D4B36", width: 0 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 10.6, y: 3.2, w: 5.6, h: 5.6, fill: { color: "16382A" }, line: { color: "16382A", width: 0 } });

  s.addText("MAJOR PROJECT  ·  DEPARTMENT OF COMPUTER APPLICATIONS (BCA)", {
    x: M, y: 1.34, w: 8.6, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12,
    bold: true, color: LIME, charSpacing: 2.4,
  });
  s.addText("PlaceMate", {
    x: M, y: 1.72, w: 8.8, h: 1.0, margin: 0, fontFace: HEAD, fontSize: 54, bold: true, color: WHITE,
  });
  s.addText("A Full-Stack Placement Cell Management System\nwith Server-Side Policy Enforcement", {
    x: M, y: 2.72, w: 8.8, h: 1.0, margin: 0, fontFace: BODY, fontSize: 20, color: MUTED, lineSpacing: 27,
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 3.92, w: 4.9, h: 2.28, fill: { color: CARD }, line: { color: HAIR, width: 0.75 },
    rectRadius: 0.1, shadow: shadow(),
  });
  s.addText("Presented by", {
    x: M + 0.28, y: 4.14, w: 4.4, h: 0.24, margin: 0, fontFace: BODY, fontSize: 11,
    bold: true, color: LIME, charSpacing: 1.6,
  });
  s.addText("Tushar Kumar", {
    x: M + 0.28, y: 4.42, w: 4.4, h: 0.36, margin: 0, fontFace: HEAD, fontSize: 21, bold: true, color: WHITE,
  });
  s.addText(
    "Department of Computer Applications (BCA)\nMaharaja Surajmal Institute, C-4 Janakpuri,\nNew Delhi – 110058\nAffiliated to Guru Gobind Singh Indraprastha\nUniversity, Delhi",
    { x: M + 0.28, y: 4.82, w: 4.4, h: 1.2, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15.5 }
  );

  const chips = ["Flask 3", "React 19", "PostgreSQL", "Vite + Tailwind 4", "Recharts", "Vercel + Neon"];
  chips.forEach((c, i) => {
    const w = 1.78;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 5.9 + (i % 2) * (w + 0.2), y: 3.98 + Math.floor(i / 2) * 0.76, w, h: 0.58,
      fill: { color: CARD_HI }, line: { color: HAIR, width: 0.75 }, rectRadius: 0.29,
    });
    s.addText(c, {
      x: 5.9 + (i % 2) * (w + 0.2), y: 3.98 + Math.floor(i / 2) * 0.76 + 0.16, w, h: 0.28,
      margin: 0, align: "center", fontFace: BODY, fontSize: 12, color: WHITE,
    });
  });

  s.addText("September 2026", {
    x: M, y: 6.46, w: 6, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, color: "5C7A6B",
  });
  s.addNotes(
    "Good morning. My name is Tushar Kumar, BCA, Maharaja Surajmal Institute. My project is PlaceMate, a placement cell management system.\n\n" +
    "The one-line pitch: colleges still run placement season on spreadsheets, and PlaceMate replaces that with a system where every eligibility rule lives on the server, every offer is recorded as data, and every decision is logged.\n\n" +
    "I will show you two portals that are actually built and working — the student portal and the placement-cell (admin) portal — plus the design decisions and the measured results."
  );
}

// ================================================================ 2. AGENDA
{
  const s = base({ kicker: "AGENDA", title: "What this presentation covers" });
  const items = [
    ["01", "Problem & motivation", "Why placement season breaks down on spreadsheets"],
    ["02", "Objectives", "The four contributions this project makes"],
    ["03", "System design", "Architecture, data model, eligibility engine, offer policy"],
    ["04", "Student portal", "Every screen a student uses, end to end"],
    ["05", "Teacher / admin portal", "Every screen the placement cell uses, end to end"],
    ["06", "Evaluation", "23 functional assertions, payload and query measurements"],
    ["07", "Limitations & future work", "Honest gaps and the roadmap that follows"],
  ];
  items.forEach((it, i) => {
    const y = TOP + i * 0.77;
    card(s, M, y, CW, 0.66, i % 2 === 0 ? CARD : CARD_HI);
    s.addText(it[0], {
      x: M + 0.26, y: y + 0.17, w: 0.7, h: 0.34, margin: 0,
      fontFace: HEAD, fontSize: 17, bold: true, color: LIME,
    });
    s.addText(it[1], {
      x: M + 1.02, y: y + 0.11, w: 4.1, h: 0.44, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 14.5, bold: true, color: WHITE,
    });
    s.addText(it[2], {
      x: M + 5.2, y: y + 0.11, w: CW - 5.5, h: 0.44, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 12.5, color: MUTED,
    });
  });
  s.addNotes("Roadmap of the talk. Design first, then the two portals in detail since that is what you will want to see, then the measurements and the honest limitations.");
}

// ================================================================ 3. PROBLEM
{
  const s = base({
    kicker: "PROBLEM STATEMENT",
    title: "Placement season is a small operations centre",
    sub: "Hundreds of students, dozens of drives, rules that do not bend — coordinated by hand.",
  });
  const cols = [
    ["The load", GREEN, [
      "Several hundred final-year students",
      "A few dozen visiting companies",
      "A rolling calendar of recruitment drives",
      "Minimum CGPA, department limits, deadlines",
    ]],
    ["What goes wrong", CORAL, [
      "Spreadsheets drift out of date as staff edit in turns",
      "Nobody can say later why a student was rejected",
      "Students hear about drives days late, apply by email",
      "The office re-enters every application by hand",
    ]],
    ["What is missing", AMBER, [
      "No single place that decides eligibility",
      "No record of who changed a decision, or when",
      "No protection against a student taking a worse offer",
      "No live picture of the season for the cell",
    ]],
  ];
  cols.forEach((c, i) => {
    const w = (CW - 0.72) / 3;
    const x = M + i * (w + 0.36);
    card(s, x, TOP, w, 4.62, CARD);
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.26, y: TOP + 0.3, w: w - 0.52, h: 0.52, fill: { color: c[1] }, line: { color: c[1], width: 0 }, rectRadius: 0.12,
    });
    s.addText(c[0], {
      x: x + 0.26, y: TOP + 0.44, w: w - 0.52, h: 0.28, margin: 0, align: "center",
      fontFace: BODY, fontSize: 14, bold: true, color: BG,
    });
    s.addText(bullets(c[2], { size: 13, gap: 13, lineSpacing: 19 }), {
      x: x + 0.26, y: TOP + 1.02, w: w - 0.52, h: 3.3, margin: 0, valign: "top",
    });
  });
  s.addNotes(
    "Frame the problem in the placement office's own terms. The volume is not the hard part; the hard part is that the rules are enforced by whoever is editing the sheet that day.\n\n" +
    "Three consequences I want you to remember, because the design answers each one: rules drift, decisions are unauditable, and there is no policy protecting a student who already holds an offer."
  );
}

// ================================================================ 4. OBJECTIVES
{
  const s = base({
    kicker: "OBJECTIVES",
    title: "Four contributions",
    sub: "Each one is implemented and verified, not proposed.",
  });
  const items = [
    ["01", "One eligibility engine", "Eligibility rules live in a single server-side function used by four call sites, so the student view and the admin view cannot disagree.", GREEN],
    ["02", "Offer ladder policy", "An automatically maintained placement-record table stops a placed student from sitting for a lower-paying drive.", LIME],
    ["03", "Append-only audit trail", "Every status transition appends a row: stage, note, acting user, timestamp. Decisions can be replayed.", AMBER],
    ["04", "Measured performance", "Code splitting plus joined queries cut the first payload by more than half and removed per-row database work.", GREEN],
  ];
  items.forEach((it, i) => {
    const w = (CW - 0.36) / 2;
    const x = M + (i % 2) * (w + 0.36);
    const y = TOP + Math.floor(i / 2) * 2.44;
    card(s, x, y, w, 2.24);
    glyph(s, x + 0.3, y + 0.32, 0.62, it[0], { fill: it[4], fg: BG, size: 15 });
    s.addText(it[1], {
      x: x + 1.1, y: y + 0.42, w: w - 1.4, h: 0.42, margin: 0, valign: "middle",
      fontFace: HEAD, fontSize: 19, bold: true, color: WHITE,
    });
    s.addText(it[2], {
      x: x + 0.3, y: y + 1.12, w: w - 0.6, h: 0.96, margin: 0,
      fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 17.5,
    });
  });
  s.addNotes("Four concrete deliverables. Emphasise that one function owning the rules is a design decision with a testable consequence — the admin badge and the student button are computed by the same code.");
}

// ================================================================ 5. STACK
{
  const s = base({ kicker: "TECHNOLOGY", title: "Stack and deployment", sub: "A conventional three-tier web application, deliberately." });
  const layers = [
    ["Frontend", GREEN, "React 19 · Vite · Tailwind CSS 4 · React Router · Recharts", "Role-guarded routes, lazy-loaded dashboard, compositor-only animation"],
    ["Backend", LIME, "Python 3 · Flask 3 application factory · Flask-SQLAlchemy · Flask-CORS", "Three blueprints: auth, admin, portal. Role-checking decorator on every route"],
    ["Data", AMBER, "PostgreSQL via psycopg · SQLAlchemy ORM · pandas aggregation", "Neon serverless Postgres in production; unique constraints enforce core rules"],
    ["Delivery", GREEN, "GitHub · Vercel (frontend + API as separate services) · Neon", "Session cookie, CORS, and an origin guard handle the split deployment"],
  ];
  layers.forEach((l, i) => {
    const y = TOP + i * 1.19;
    card(s, M, y, CW, 1.02, i % 2 === 0 ? CARD : CARD_HI);
    s.addShape(pptx.ShapeType.roundRect, {
      x: M + 0.24, y: y + 0.24, w: 1.62, h: 0.54, fill: { color: l[1] }, line: { color: l[1], width: 0 }, rectRadius: 0.1,
    });
    s.addText(l[0], {
      x: M + 0.24, y: y + 0.36, w: 1.62, h: 0.3, margin: 0, align: "center",
      fontFace: BODY, fontSize: 13.5, bold: true, color: BG,
    });
    s.addText(l[2], {
      x: M + 2.06, y: y + 0.16, w: CW - 2.4, h: 0.34, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 13.5, bold: true, color: WHITE,
    });
    s.addText(l[3], {
      x: M + 2.06, y: y + 0.52, w: CW - 2.4, h: 0.36, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 11.5, color: MUTED,
    });
  });
  s.addNotes("Nothing exotic on purpose: a JSON REST API in Flask over PostgreSQL, consumed by a React single-page app. The interesting engineering is in the rules and the audit trail, not the stack choice.");
}

// ================================================================ 6. ARCHITECTURE
{
  const s = base({ kicker: "ARCHITECTURE", title: "Request path through the system" });
  const y = TOP + 0.16;
  // browser box
  card(s, M, y, 2.55, 3.05, CARD_HI);
  s.addText("Browser", { x: M + 0.2, y: y + 0.22, w: 2.15, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText("React SPA\n\nAdmin rail or\nportal rail,\nchosen by role\n\nfetch with\ncredentials", {
    x: M + 0.2, y: y + 0.62, w: 2.15, h: 2.2, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 16,
  });

  // arrow
  s.addShape(pptx.ShapeType.rightArrow, { x: M + 2.72, y: y + 1.36, w: 0.52, h: 0.34, fill: { color: GREEN }, line: { color: GREEN, width: 0 } });

  // API box
  card(s, M + 3.42, y, 4.3, 3.05, CARD);
  s.addText("Flask API", { x: M + 3.64, y: y + 0.22, w: 3.9, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const eps = [
    ["/api/auth", "login · logout · me · password"],
    ["/api/admin", "dashboard · students · companies · drives · applications · notices · export"],
    ["/api/portal", "summary · drives · apply · applications · profile"],
  ];
  eps.forEach((e, i) => {
    const ey = y + 0.66 + i * 0.76;
    s.addText(e[0], { x: M + 3.64, y: ey, w: 3.9, h: 0.26, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: GREEN });
    s.addText(e[1], { x: M + 3.64, y: ey + 0.26, w: 3.9, h: 0.42, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 14 });
  });

  s.addShape(pptx.ShapeType.rightArrow, { x: M + 7.9, y: y + 1.36, w: 0.52, h: 0.34, fill: { color: GREEN }, line: { color: GREEN, width: 0 } });

  // DB box
  card(s, M + 8.6, y, 3.53, 3.05, CARD_HI);
  s.addText("PostgreSQL", { x: M + 8.82, y: y + 0.22, w: 3.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText("users · students · companies\ndrives · applications · notices\n\n+ placement_records\n+ application_status_history", {
    x: M + 8.82, y: y + 0.66, w: 3.1, h: 1.5, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 16.5,
  });
  s.addText("Neon serverless\n(compute / storage split)", {
    x: M + 8.82, y: y + 2.28, w: 3.1, h: 0.6, margin: 0, fontFace: BODY, fontSize: 10.5, italic: true, color: GREEN, lineSpacing: 14,
  });

  // cross-cutting band
  card(s, M, y + 3.34, CW, 0.86, "16382A");
  s.addText("Cross-cutting on every request:", {
    x: M + 0.26, y: y + 3.5, w: 2.5, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: LIME,
  });
  s.addText("role-checking decorator  ·  credentials-enabled CORS  ·  request-origin guard on POST/PUT/PATCH/DELETE (production)", {
    x: M + 2.9, y: y + 3.48, w: CW - 3.2, h: 0.32, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12, color: WHITE,
  });
  s.addNotes("Walk left to right: the SPA never decides anything, it renders what the API returns. The API is three blueprints behind one role decorator. The two extra tables on the right are the ones this project adds to the conventional design.");
}

// ================================================================ 7. ROLES
{
  const s = base({ kicker: "ROLES", title: "Two portals, two audiences", sub: "One codebase, one API, two role-guarded experiences." });
  const roles = [
    {
      t: "Student portal", c: GREEN, to: "/portal",
      pts: ["See only the drives they are actually eligible for",
            "Apply in one click, or read exactly why they cannot",
            "Track each application and its stage history",
            "Keep phone and skills current, change password",
            "See upcoming deadlines and notices on the home page"],
    },
    {
      t: "Teacher / placement cell (admin)", c: LIME, to: "/dashboard",
      pts: ["Maintain students, companies, drives and notices",
            "Import a cohort by CSV, with per-row error reporting",
            "Move candidates between four stages; every move is logged",
            "Read a descriptive dashboard of the season",
            "Override an offer's actual CTC; export major tables as CSV"],
    },
  ];
  roles.forEach((r, i) => {
    const w = (CW - 0.4) / 2;
    const x = M + i * (w + 0.4);
    card(s, x, TOP, w, 4.66);
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.3, y: TOP + 0.32, w: w - 0.6, h: 0.66, fill: { color: r.c }, line: { color: r.c, width: 0 }, rectRadius: 0.12,
    });
    s.addText(r.t, {
      x: x + 0.3, y: TOP + 0.5, w: w - 0.6, h: 0.32, margin: 0, align: "center",
      fontFace: BODY, fontSize: 16, bold: true, color: BG,
    });
    s.addText(r.to, {
      x: x + 0.3, y: TOP + 1.06, w: w - 0.6, h: 0.28, margin: 0, align: "center",
      fontFace: BODY, fontSize: 11.5, color: GREEN, italic: true,
    });
    s.addText(bullets(r.pts, { size: 13.5, gap: 14, lineSpacing: 20 }), {
      x: x + 0.34, y: TOP + 1.5, w: w - 0.68, h: 2.9, margin: 0, valign: "top",
    });
  });
  s.addNotes(
    "Two audiences, one API. The student portal is a read-and-apply surface; the admin portal is the operations console.\n\n" +
    "A note on naming: the project brief groups the placement officer and faculty coordinators together, so the 'teacher portal' is the admin role in this system. Same login system, role field on the user record."
  );
}

// ================================================================ 8. DATA MODEL
{
  const s = base({ kicker: "DATA MODEL", title: "Six core tables, two that carry the policy" });
  miniTable(
    s, M, TOP, CW,
    ["Table", "Holds", "Key columns", "Role in the design"],
    [
      ["users", "Login identities", "email, password_hash, role", "Role drives portal routing"],
      ["students", "Student records", "roll_no, department, program, cgpa, skills", "Eligibility inputs + profile"],
      ["companies", "Recruiters", "name, sector, website", "Parent of drives"],
      ["drives", "Recruitment drives", "role, package_lpa, min_cgpa, eligible_departments, eligible_programs, application_deadline, is_active", "Eligibility inputs"],
      ["applications", "Student × drive link", "student_id, drive_id, status, applied_at", "Unique (student, drive) stops duplicates"],
      ["notices", "Announcements", "title, body, created_at", "Student and admin notice board"],
      ["placement_records", "Actual offers", "student_id, drive_id, package_lpa, offered_on", "Backs the offer ladder"],
      ["application_status_history", "Audit trail", "application_id, status, note, changed_by, created_at", "Append-only; never updated"],
    ],
    [2.4, 1.6, 4.6, 3.53]
  );
  s.addNotes(
    "The top six tables are the conventional part. The two in the same visual weight at the bottom are the contribution: offers exist as their own records rather than as a status flag, and history exists as an append-only log.\n\n" +
    "Point at the unique constraint on (student, drive) — it enforces the no-duplicate rule in the database, which also settles a race between two simultaneous apply requests without application-level locking."
  );
}

// ================================================================ 9. ELIGIBILITY ENGINE
{
  const s = base({
    kicker: "DESIGN  ·  ELIGIBILITY",
    title: "One eligibility function, four call sites",
    sub: "It returns an allow flag and, when the answer is no, the reason string the student will read.",
  });
  // checks column
  card(s, M, TOP, 5.15, 4.6);
  s.addText("The checks, in order", {
    x: M + 0.28, y: TOP + 0.24, w: 4.6, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME,
  });
  const checks = ["Application deadline has not passed", "The drive is active, not closed",
                  "Student's program is in eligible_programs", "Student's department is in eligible_departments",
                  "CGPA clears the drive's minimum"];
  checks.forEach((c, i) => {
    const y = TOP + 0.78 + i * 0.64;
    glyph(s, M + 0.3, y, 0.36, String(i + 1), { fill: GREEN, fg: BG, size: 11 });
    s.addText(c, {
      x: M + 0.78, y: y + 0.02, w: 4.0, h: 0.34, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 12.5, color: WHITE,
    });
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: M + 0.3, y: TOP + 4.0, w: 4.55, h: 0.42, fill: { color: "3A3320" }, line: { color: AMBER, width: 1 }, rectRadius: 0.1,
  });
  s.addText("The offer ladder is a separate check, applied only at apply time", {
    x: M + 0.42, y: TOP + 4.08, w: 4.35, h: 0.28, margin: 0, fontFace: BODY, fontSize: 10.5, bold: true, color: AMBER,
  });
  // call sites column
  card(s, M + 5.55, TOP, CW - 5.55, 4.6, CARD_HI);
  s.addText("Four call sites, one source of truth", {
    x: M + 5.83, y: TOP + 0.24, w: CW - 6.1, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME,
  });
  const sites = [
    ["Student drive listing", "Decides Apply vs Not eligible, and supplies the reason"],
    ["Apply endpoint", "Re-checks on the server; an ineligible POST is refused"],
    ["Admin application badge", "Same verdict shown to the placement cell"],
    ["Eligible-but-not-applied list", "How the cell sees who it should chase"],
  ];
  sites.forEach((it, i) => {
    const y = TOP + 0.78 + i * 0.95;
    s.addText(it[0], { x: M + 5.83, y, w: CW - 6.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13.5, bold: true, color: WHITE });
    s.addText(it[1], { x: M + 5.83, y: y + 0.3, w: CW - 6.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15.5 });
  });
  s.addNotes(
    "The central design decision: the interface may render whatever it likes, but only the API decides. Four call sites share this one function, so the student's button and the officer's badge are computed by the same code.\n\n" +
    "Because the reason string comes from the function that made the decision, the student reads 'Needs CGPA >= 7' rather than a generic failure. In practice that answers most of the queries that would otherwise reach the placement office.\n\n" +
    "Be precise if asked: the offer ladder is a second, separate check applied at apply time, and an admin can still change a status without eligibility being re-evaluated. That is deliberate — the office overrides rules in real cases — but it means 'one function' describes eligibility, not every decision in the system."
  );
}

// ================================================================ 10. OFFER LADDER
{
  const s = base({
    kicker: "DESIGN  ·  OFFERS",
    title: "The offer ladder",
    sub: "A placed student may only apply to drives paying at least their best offer + 2.0 LPA.",
  });
  // step chain
  const steps = [
    ["Marked selected", "The admin moves an application to selected.", GREEN],
    ["Offer recorded", "A placement record is inserted: student, drive, date, package seeded from the drive.", LIME],
    ["CTC overridden", "The cell replaces the advertised figure with the actual CTC.", AMBER],
    ["Ladder enforced", "Apply is refused unless package ≥ best offer + 2.0 LPA.", GREEN],
  ];
  steps.forEach((st, i) => {
    const w = (CW - 3 * 0.24) / 4;
    const x = M + i * (w + 0.24);
    card(s, x, TOP, w, 2.5, i % 2 === 0 ? CARD : CARD_HI);
    glyph(s, x + 0.26, TOP + 0.26, 0.5, String(i + 1), { fill: st[2], fg: BG, size: 13 });
    s.addText(st[0], {
      x: x + 0.26, y: TOP + 0.94, w: w - 0.52, h: 0.56, margin: 0,
      fontFace: HEAD, fontSize: 15.5, bold: true, color: WHITE, lineSpacing: 19,
    });
    s.addText(st[1], {
      x: x + 0.26, y: TOP + 1.56, w: w - 0.52, h: 0.8, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15.5,
    });
  });
  // worked example
  card(s, M, TOP + 2.78, CW, 1.82, "16382A");
  s.addText("Worked example", {
    x: M + 0.3, y: TOP + 2.94, w: 2.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: LIME,
  });
  s.addText("Aarav holds an offer at 6.0 LPA, so the threshold is 8.0 LPA.", {
    x: M + 2.6, y: TOP + 2.92, w: CW - 2.9, h: 0.32, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 12.5, color: WHITE,
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: M + 0.3, y: TOP + 3.34, w: 5.4, h: 0.62, fill: { color: "1B3D2C" }, line: { color: GREEN, width: 1 }, rectRadius: 0.1,
  });
  s.addText("Drive at 9.0 LPA   →   allowed", {
    x: M + 0.5, y: TOP + 3.5, w: 5.0, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: GREEN,
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: M + 5.95, y: TOP + 3.34, w: 5.55, h: 0.62, fill: { color: "3A2020" }, line: { color: CORAL, width: 1 }, rectRadius: 0.1,
  });
  s.addText("Drive at 7.0 LPA   →   refused, with reason", {
    x: M + 6.15, y: TOP + 3.5, w: 5.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: CORAL,
  });
  s.addText("Drives with no published package stay open — the rule cannot be evaluated against them. Dashboard package figures read actual offers when they exist, and fall back to advertised figures otherwise.", {
    x: M + 0.3, y: TOP + 4.04, w: CW - 0.6, h: 0.5, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 15,
  });
  s.addNotes(
    "Moving an application off selected deletes the placement record, so the offer table and the application states cannot disagree for long.\n\n" +
    "The 2.0 LPA increment is a named constant in the code, so the institution can tune the policy without touching logic.\n\n" +
    "Known limitation to admit if asked: the ladder trusts the advertised package until the cell overrides it, so an inflated listing temporarily admits students the rule would otherwise exclude."
  );
}

// ================================================================ 11. AUDIT TRAIL
{
  const s = base({
    kicker: "DESIGN  ·  AUDITABILITY",
    title: "Every decision leaves a trace",
    sub: "application_status_history is append-only: rows are added, never updated, never deleted.",
  });
  card(s, M, TOP, 6.1, 4.6);
  s.addText("What a row records", { x: M + 0.28, y: TOP + 0.24, w: 5.5, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const fields = [
    ["application_id", "which application moved"],
    ["status", "the new stage: applied, shortlisted, selected, rejected"],
    ["note", "optional context the cell wants on the record"],
    ["changed_by", "the user who made the move"],
    ["created_at", "timestamp, added automatically"],
  ];
  fields.forEach((f, i) => {
    const y = TOP + 0.76 + i * 0.62;
    s.addText(f[0], { x: M + 0.3, y: y + 0.02, w: 1.9, h: 0.34, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12.5, bold: true, color: GREEN });
    s.addText(f[1], { x: M + 2.26, y: y + 0.02, w: 3.6, h: 0.34, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12, color: MUTED });
  });
  s.addText("The initial application is itself the first row, written in the same transaction as the application.", {
    x: M + 0.3, y: TOP + 3.9, w: 5.5, h: 0.5, margin: 0, fontFace: BODY, fontSize: 11, italic: true, color: MUTED, lineSpacing: 15,
  });

  // timeline card
  card(s, M + 6.5, TOP, CW - 6.5, 4.6, CARD_HI);
  s.addText("Where it surfaces", { x: M + 6.78, y: TOP + 0.24, w: CW - 7.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const uses = [
    ["Admin application detail", "A full timeline of the application's life"],
    ["Student applications list", "Compact stage chips under each application"],
    ["Season review", "The cell can reconstruct when any decision was made"],
    ["Cascade delete", "Rows are removed only when the whole application is"],
  ];
  uses.forEach((u, i) => {
    const y = TOP + 0.8 + i * 0.9;
    s.addShape(pptx.ShapeType.ellipse, { x: M + 6.78, y: y + 0.08, w: 0.18, h: 0.18, fill: { color: LIME }, line: { color: LIME, width: 0 } });
    s.addText(u[0], { x: M + 7.1, y, w: CW - 7.4, h: 0.28, margin: 0, fontFace: BODY, fontSize: 13.5, bold: true, color: WHITE });
    s.addText(u[1], { x: M + 7.1, y: y + 0.28, w: CW - 7.4, h: 0.5, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15.5 });
  });
  s.addNotes("None of the placement systems I surveyed describe an application-level history. This is the feature the placement office actually asked for, because it answers the awkward question: why was this student rejected, and who decided?");
}

// ================================================================ 12. SECURITY
{
  const s = base({
    kicker: "SECURITY",
    title: "Sessions in a split deployment",
    sub: "Because the interface and the API run on different subdomains, the cookie choice forces a guard.",
  });
  const left = [
    ["Signed session cookie", "Flask's client-side session, signed with SECRET_KEY. Production refuses to boot without a real key, so the development fallback cannot leak into a deployment."],
    ["SameSite=None + Secure", "Required for the cross-site cookie the split deployment needs — and it means the browser will also attach the cookie to cross-site POSTs."],
  ];
  const right = [
    ["Request-origin guard", "Before any POST, PUT, PATCH or DELETE, the Origin (or Referer) host must match the API's own host or the configured frontend origin. A browser-sent cross-site POST gets 403."],
    ["Header-less clients allowed", "Non-browser clients send neither header; they are allowed. The guard runs only in production, so the Vite dev proxy is unaffected."],
  ];
  [...left, ...right].forEach((it, i) => {
    const w = (CW - 0.36) / 2;
    const x = M + (i % 2) * (w + 0.36);
    const y = TOP + Math.floor(i / 2) * 2.44;
    card(s, x, y, w, 2.24, i % 2 === 0 ? CARD : CARD_HI);
    s.addText(it[0], { x: x + 0.3, y: y + 0.28, w: w - 0.6, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: LIME });
    s.addText(it[1], { x: x + 0.3, y: y + 0.82, w: w - 0.6, h: 1.2, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 17.5 });
  });
  s.addNotes(
    "This is the part I would happily be questioned on. SameSite=None is not a preference, it is a consequence of deploying the SPA and the API as separate services — and it widens the CSRF surface, because CORS cannot stop a simple form post.\n\n" +
    "So the server verifies the origin of every state-changing request. In development the check is skipped so the Vite proxy keeps working."
  );
}

// ================================================================ 13. STUDENT DIVIDER
{
  pageNo += 1;
  const s = pptx.addSlide();
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.ellipse, { x: 9.4, y: -1.6, w: 6.2, h: 6.2, fill: { color: "1B4632" }, line: { color: "1B4632", width: 0 } });
  s.addText("PART ONE", { x: M, y: 2.28, w: 8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: GREEN, charSpacing: 3 });
  s.addText("Student portal", { x: M, y: 2.62, w: 9, h: 0.94, margin: 0, fontFace: HEAD, fontSize: 46, bold: true, color: WHITE });
  s.addText("Four screens, reachable from a mobile tab bar as well as the desktop rail.\nEvery drive a student sees already carries its own eligibility verdict.", {
    x: M, y: 3.62, w: 8.4, h: 0.9, margin: 0, fontFace: BODY, fontSize: 15, color: MUTED, lineSpacing: 22,
  });
  s.addNotes("Now the build itself. Student side first — four screens.");
}

// ================================================================ 14. STUDENT HOME
{
  const s = base({
    kicker: "STUDENT PORTAL  ·  1 OF 4",
    title: "Home: the season at a glance",
    sub: "Route /portal — greeting, placement status, four counters, deadlines, notices, quick actions.",
  });
  // counts
  const counts = [["Applied", "4", GREEN], ["Shortlisted", "2", LIME], ["Selected", "1", GREEN], ["Rejected", "1", CORAL]];
  counts.forEach((c, i) => {
    const w = (CW - 3 * 0.24) / 4;
    const x = M + i * (w + 0.24);
    card(s, x, TOP, w, 1.28);
    s.addText(c[0].toUpperCase(), { x: x + 0.24, y: TOP + 0.22, w: w - 0.48, h: 0.24, margin: 0, fontFace: BODY, fontSize: 10.5, bold: true, color: MUTED, charSpacing: 1.4 });
    s.addText(c[1], { x: x + 0.24, y: TOP + 0.5, w: w - 0.48, h: 0.62, margin: 0, fontFace: HEAD, fontSize: 34, bold: true, color: c[2] });
  });
  // two panels
  card(s, M, TOP + 1.56, 6.0, 3.04);
  s.addText("Upcoming deadlines", { x: M + 0.28, y: TOP + 1.78, w: 5.4, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: LIME });
  [["Nimbus Analytics · Data Analyst", "8.5 LPA", "12 Oct"],
   ["Vertex Systems · QA Engineer", "6.0 LPA", "18 Oct"],
   ["Helios Retail · Business Analyst", "Package TBD", "24 Oct"]].forEach((r, i) => {
    const y = TOP + 2.18 + i * 0.68;
    s.addText(r[0], { x: M + 0.28, y, w: 4.1, h: 0.28, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: WHITE });
    s.addText(r[1], { x: M + 0.28, y: y + 0.26, w: 4.1, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED });
    s.addText(r[2], { x: M + 4.4, y: y + 0.06, w: 1.3, h: 0.3, margin: 0, align: "right", fontFace: BODY, fontSize: 11.5, color: LIME });
  });
  card(s, M + 6.35, TOP + 1.56, CW - 6.35, 3.04, CARD_HI);
  s.addText("Latest notices & quick actions", { x: M + 6.63, y: TOP + 1.78, w: CW - 6.9, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: LIME });
  const acts = ["Apply to drives — browse what you qualify for", "Track applications — every stage so far",
                "Update profile — keep phone and skills current", "Read notices — posted by the placement cell"];
  s.addText(bullets(acts, { size: 12.5, gap: 12, lineSpacing: 18 }), {
    x: M + 6.63, y: TOP + 2.2, w: CW - 6.95, h: 2.2, margin: 0, valign: "top",
  });
  s.addNotes("GET /api/portal/summary returns profile, application counts, upcoming deadlines and latest notices in one request — the home screen makes a single call.");
}

// ================================================================ 15. STUDENT DRIVES
{
  const s = base({
    kicker: "STUDENT PORTAL  ·  2 OF 4",
    title: "Drives: eligibility shown up front",
    sub: "Route /portal/drives — each card carries the verdict, so the student never guesses.",
  });
  // three card mocks
  const mocks = [
    { co: "Nimbus Analytics", t: "Eligible", c: GREEN, pkg: "8.5", cgpa: "7.0", foot: "APPLY NOW", fg: BG, why: "CGPA 8.1 clears the 7.0 minimum" },
    { co: "Vertex Systems", t: "Already applied", c: LIME, pkg: "6.0", cgpa: "6.0", foot: "APPLIED · SHORTLISTED", fg: BG, why: "Duplicate applies are refused by a unique constraint" },
    { co: "Orion Labs", t: "Not eligible", c: CORAL, pkg: "12.0", cgpa: "8.5", foot: "NEEDS CGPA ≥ 8.5", fg: BG, why: "The reason string comes from the engine" },
  ];
  mocks.forEach((mk, i) => {
    const w = (CW - 2 * 0.34) / 3;
    const x = M + i * (w + 0.34);
    card(s, x, TOP, w, 3.5);
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.26, y: TOP + 0.26, w: 1.3, h: 0.34, fill: { color: mk.c }, line: { color: mk.c, width: 0 }, rectRadius: 0.17,
    });
    s.addText(mk.t, { x: x + 0.26, y: TOP + 0.32, w: 1.3, h: 0.24, margin: 0, align: "center", fontFace: BODY, fontSize: 10, bold: true, color: mk.fg });
    s.addText(mk.co, { x: x + 0.26, y: TOP + 0.76, w: w - 0.52, h: 0.36, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: WHITE });
    s.addText("Data Analyst · Full time", { x: x + 0.26, y: TOP + 1.12, w: w - 0.52, h: 0.28, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED });
    // metric strip
    const sy = TOP + 1.5;
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.26, y: sy, w: w - 0.52, h: 0.82, fill: { color: CARD_HI }, line: { color: HAIR, width: 0.75 }, rectRadius: 0.1,
    });
    s.addText(mk.pkg, { x: x + 0.36, y: sy + 0.1, w: (w - 0.72) / 3, h: 0.4, margin: 0, align: "center", fontFace: HEAD, fontSize: 19, bold: true, color: LIME });
    s.addText(mk.cgpa, { x: x + 0.36 + (w - 0.72) / 3, y: sy + 0.1, w: (w - 0.72) / 3, h: 0.4, margin: 0, align: "center", fontFace: HEAD, fontSize: 19, bold: true, color: WHITE });
    s.addText("—", { x: x + 0.36 + 2 * (w - 0.72) / 3, y: sy + 0.1, w: (w - 0.72) / 3, h: 0.4, margin: 0, align: "center", fontFace: HEAD, fontSize: 19, bold: true, color: MUTED });
    ["LPA", "MIN CGPA", "STATUS"].forEach((lb, j) => {
      s.addText(lb, { x: x + 0.36 + j * (w - 0.72) / 3, y: sy + 0.52, w: (w - 0.72) / 3, h: 0.22, margin: 0, align: "center", fontFace: BODY, fontSize: 8.5, color: MUTED, charSpacing: 1 });
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.26, y: TOP + 2.62, w: w - 0.52, h: 0.58, fill: { color: i === 2 ? "3A2020" : CARD_HI },
      line: { color: i === 2 ? CORAL : HAIR, width: 1 }, rectRadius: 0.12,
    });
    s.addText(mk.foot, {
      x: x + 0.3, y: TOP + 2.78, w: w - 0.6, h: 0.28, margin: 0, align: "center",
      fontFace: BODY, fontSize: 11, bold: true, color: i === 2 ? CORAL : (i === 1 ? GREEN : LIME),
    });
    s.addText(mk.why, {
      x: x + 0.26, y: TOP + 3.24, w: w - 0.52, h: 0.4, margin: 0, fontFace: BODY, fontSize: 10.5, italic: true, color: MUTED, lineSpacing: 13.5,
    });
  });
  s.addNotes(
    "The card itself is the explanation. A student sees who pays what, what the minimum is, and either a button or the exact reason they cannot press it.\n\n" +
    "Opening a card gives the drive detail route with the same verdict plus company website and eligible departments."
  );
}

// ================================================================ 16. STUDENT APPLICATIONS
{
  const s = base({
    kicker: "STUDENT PORTAL  ·  3 OF 4",
    title: "Applications: stage and history",
    sub: "Route /portal/applications — each row shows package, drive date and the stage chips.",
  });
  card(s, M, TOP, CW, 1.5);
  s.addText("Nimbus Analytics · Data Analyst", { x: M + 0.3, y: TOP + 0.24, w: 6.5, h: 0.34, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: WHITE });
  s.addText("Analyst drive 2026", { x: M + 0.3, y: TOP + 0.58, w: 6.5, h: 0.28, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED });
  s.addShape(pptx.ShapeType.roundRect, {
    x: M + 9.1, y: TOP + 0.28, w: 1.9, h: 0.42, fill: { color: LIME }, line: { color: LIME, width: 0 }, rectRadius: 0.21,
  });
  s.addText("Shortlisted", { x: M + 9.1, y: TOP + 0.37, w: 1.9, h: 0.26, margin: 0, align: "center", fontFace: BODY, fontSize: 11.5, bold: true, color: BG });
  [["8.5 LPA", "Package"], ["12 Oct", "Drive date"], ["02 Sep", "Applied"]].forEach((r, i) => {
    const x = M + 0.3 + i * 2.7;
    s.addText(r[0], { x, y: TOP + 0.94, w: 2.4, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: i === 0 ? LIME : WHITE });
    s.addText(r[1], { x, y: TOP + 1.24, w: 2.4, h: 0.24, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });
  });
  // history chips
  card(s, M, TOP + 1.76, CW, 2.84, CARD_HI);
  s.addText("Status history from the audit table", { x: M + 0.3, y: TOP + 1.98, w: 8, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: LIME });
  const hist = [
    ["Applied", "02 Sep 2026", "Application created", GREEN],
    ["Shortlisted", "05 Sep 2026", "Cleared the aptitude round", LIME],
    ["Shortlisted", "07 Sep 2026", "Moved to the technical panel", LIME],
  ];
  hist.forEach((h, i) => {
    const y = TOP + 2.5 + i * 0.66;
    s.addShape(pptx.ShapeType.ellipse, { x: M + 0.42, y: y + 0.1, w: 0.2, h: 0.2, fill: { color: h[3] }, line: { color: h[3], width: 0 } });
    if (i < hist.length - 1) s.addShape(pptx.ShapeType.rect, { x: M + 0.51, y: y + 0.32, w: 0.02, h: 0.46, fill: { color: HAIR }, line: { color: HAIR, width: 0 } });
    s.addText(h[0], { x: M + 0.86, y, w: 2.4, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: WHITE });
    s.addText(h[1], { x: M + 3.3, y, w: 2.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, color: LIME });
    s.addText(h[2], { x: M + 5.6, y, w: CW - 6.0, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED });
  });
  s.addNotes("This timeline is rendered from the append-only table, not from a status field — which is why it can show two shortlisted events in sequence rather than one overwritten value.");
}

// ================================================================ 17. STUDENT PROFILE
{
  const s = base({
    kicker: "STUDENT PORTAL  ·  4 OF 4",
    title: "Profile and account",
    sub: "Route /portal/profile — the student maintains the record the placement cell relies on.",
  });
  card(s, M, TOP, 6.1, 2.2);
  s.addText("Personal details", { x: M + 0.3, y: TOP + 0.24, w: 5.5, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const pv = [["Name", "Aarav Sharma"], ["Email", "aarav@example.com"], ["Program", "B.Tech"], ["Department", "CSE"], ["CGPA", "8.10"]];
  pv.forEach((p, i) => {
    const x = M + 0.3 + (i % 3) * 1.85;
    const y = TOP + 0.66 + Math.floor(i / 3) * 0.66;
    s.addText(p[0].toUpperCase(), { x, y, w: 1.7, h: 0.22, margin: 0, fontFace: BODY, fontSize: 9, color: MUTED, charSpacing: 1.2 });
    s.addText(p[1], { x, y: y + 0.22, w: 1.75, h: 0.28, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: WHITE });
  });
  card(s, M + 6.35, TOP, CW - 6.35, 2.2, CARD_HI);
  s.addText("Editable by the student", { x: M + 6.63, y: TOP + 0.24, w: CW - 6.9, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets(["Phone number", "Skills, as a comma-separated list", "Change own password (current + new)"], { size: 12.5, gap: 12, lineSpacing: 18 }), {
    x: M + 6.63, y: TOP + 0.68, w: CW - 6.95, h: 1.3, margin: 0, valign: "top",
  });
  // provisioning band
  card(s, M, TOP + 2.5, CW, 2.1, "16382A");
  s.addText("How a student gets an account", { x: M + 0.3, y: TOP + 2.72, w: 6, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const prov = [
    ["No self-registration", "Identities are created by the placement cell, not by the public."],
    ["Random temp password", "A generated value shown to the admin at creation or reset. Not derived from roll numbers, and not a fixed default."],
    ["First-login change", "The student changes it from this screen via the password endpoint."],
  ];
  prov.forEach((p, i) => {
    const x = M + 0.3 + i * 4.0;
    s.addText(p[0], { x, y: TOP + 3.2, w: 3.8, h: 0.28, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: GREEN });
    s.addText(p[1], { x, y: TOP + 3.5, w: 3.75, h: 0.9, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 14.5 });
  });
  s.addNotes("Worth stating plainly: there is no student self-registration. The placement cell is the source of truth for who exists, which is what an institutional tool should do. Passwords are never derived from roll numbers.");
}

// ================================================================ 18. TEACHER DIVIDER
{
  pageNo += 1;
  const s = pptx.addSlide();
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.ellipse, { x: 9.4, y: -1.6, w: 6.2, h: 6.2, fill: { color: "24402A" }, line: { color: "24402A", width: 0 } });
  s.addText("PART TWO", { x: M, y: 2.28, w: 8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, bold: true, color: LIME, charSpacing: 3 });
  s.addText("Teacher / placement-cell portal", { x: M, y: 2.62, w: 10.5, h: 0.94, margin: 0, fontFace: HEAD, fontSize: 40, bold: true, color: WHITE });
  s.addText("The operations console. Six rail sections: Home, Students, Companies, Drives,\nApplications and Notices — plus CSV import and export on every major table.", {
    x: M, y: 3.62, w: 9.4, h: 0.9, margin: 0, fontFace: BODY, fontSize: 15, color: MUTED, lineSpacing: 22,
  });
  s.addNotes("Now the placement cell side. This is the console the office works in every day.");
}

// ================================================================ 19. TEACHER DASHBOARD
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  1 OF 6",
    title: "Home: the whole season on one screen",
    sub: "KPIs, an application trend, a funnel, skill demand, and department statistics.",
  });
  const kpis = [["Students", "412"], ["Companies", "38"], ["Active drives", "11"], ["Applications", "1 264"], ["Shortlisted", "318"], ["Selected", "166"]];
  kpis.forEach((k, i) => {
    const w = (CW - 5 * 0.18) / 6;
    const x = M + i * (w + 0.18);
    card(s, x, TOP, w, 0.98);
    s.addText(k[0].toUpperCase(), { x: x + 0.18, y: TOP + 0.16, w: w - 0.36, h: 0.22, margin: 0, fontFace: BODY, fontSize: 9, color: MUTED, charSpacing: 1.1 });
    s.addText(k[1], { x: x + 0.18, y: TOP + 0.4, w: w - 0.36, h: 0.46, margin: 0, fontFace: HEAD, fontSize: 24, bold: true, color: LIME });
  });
  // package stats
  stat(s, M, TOP + 1.2, 3.0, 1.5, "12.5", "Highest package (LPA), from actual offers", { color: GREEN, vsize: 32 });
  stat(s, M + 3.24, TOP + 1.2, 3.0, 1.5, "6.4", "Average package (LPA) across placed students", { color: GREEN, vsize: 32 });
  stat(s, M + 6.48, TOP + 1.2, 3.0, 1.5, "40%", "Placement rate, plus a derived unplaced count", { color: LIME, vsize: 32 });
  stat(s, M + 9.72, TOP + 1.2, CW - 9.72, 1.5, "166", "Offers in placement_records", { color: AMBER, vsize: 32 });
  // chart panel
  card(s, M, TOP + 2.92, 6.0, 1.68, CARD_HI);
  s.addText("Chart datasets returned by GET /admin/dashboard", { x: M + 0.26, y: TOP + 3.06, w: 5.5, h: 0.26, margin: 0, fontFace: BODY, fontSize: 11.5, bold: true, color: LIME });
  s.addText(bullets(["Applications over time (area)", "Application funnel (bar)", "Skill demand, horizontal bars"],
    { size: 11, gap: 5, lineSpacing: 14 }), { x: M + 0.26, y: TOP + 3.34, w: 5.5, h: 1.1, margin: 0, valign: "top" });
  card(s, M + 6.35, TOP + 2.92, CW - 6.35, 1.68, CARD_HI);
  s.addText("Department statistics", { x: M + 6.63, y: TOP + 3.06, w: CW - 6.9, h: 0.26, margin: 0, fontFace: BODY, fontSize: 11.5, bold: true, color: LIME });
  s.addText(bullets(["Aggregated with pandas", "Table: students, avg CGPA, selected, rate", "Placement-rate and average-package bars, plus a selected share donut"],
    { size: 11, gap: 5, lineSpacing: 14 }), { x: M + 6.63, y: TOP + 3.34, w: CW - 6.95, h: 1.1, margin: 0, valign: "top" });
  s.addNotes(
    "Everything the office needs for a morning briefing: volumes, the trend, where candidates drop out of the funnel, which skills recruiters are asking for, and how each department is doing.\n\n" +
    "Highest and average package read from actual placement records when they exist and fall back to advertised drive figures otherwise — so the numbers stay honest once the cell overrides a CTC."
  );
}

// ================================================================ 20. TEACHER STUDENTS
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  2 OF 6",
    title: "Students: the cohort record",
    sub: "Full CRUD, one-time password provisioning, CSV import with per-row errors, CSV export.",
  });
  card(s, M, TOP, 6.6, 4.6);
  s.addText("What the screen does", { x: M + 0.3, y: TOP + 0.24, w: 6.0, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets([
    "Search by name, roll number or email",
    "Filter by department and by program",
    "Add a student individually, or import a CSV",
    "Reset a login password on demand",
    "Open a student to see their applications and offers",
    "Export the filtered table as CSV",
  ], { size: 12.5, gap: 13, lineSpacing: 18 }), { x: M + 0.3, y: TOP + 0.72, w: 6.0, h: 3.5, margin: 0, valign: "top" });
  card(s, M + 6.85, TOP, CW - 6.85, 2.2, CARD_HI);
  s.addText("CSV import, done carefully", { x: M + 7.13, y: TOP + 0.24, w: CW - 7.4, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets([
    "Every column parsed as text, so roll and phone numbers survive",
    "File capped at 5 000 rows",
    "Bad rows reported with their reason, the rest still imported",
    "A downloadable template is linked on the page",
  ], { size: 11.5, gap: 9, lineSpacing: 15 }), { x: M + 7.13, y: TOP + 0.66, w: CW - 7.45, h: 1.4, margin: 0, valign: "top" });
  card(s, M + 6.85, TOP + 2.5, CW - 6.85, 2.1, "16382A");
  s.addText("Two details worth defending", { x: M + 7.13, y: TOP + 2.7, w: CW - 7.4, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(
    "Each created student gets a random one-time password, returned once — shown on creation or on an explicit reset. The bulk import returns the same list for the admin to distribute.\n\n" +
    "The export prefixes any cell starting with = + - or @ with an apostrophe, so a CSV opened in Excel or Sheets cannot execute a formula.",
    { x: M + 7.13, y: TOP + 3.1, w: CW - 7.45, h: 1.4, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 15 }
  );
  s.addNotes("The formula-injection guard sounds fussy until you remember export files get opened in Excel by office staff — a student whose name begins with '=' should not run code.");
}

// ================================================================ 21. TEACHER COMPANIES & DRIVES
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  3 OF 6",
    title: "Companies and drives",
    sub: "A drive is the unit of work: one company, one role, one set of rules, one deadline.",
  });
  card(s, M, TOP, 5.5, 3.05);
  s.addText("Companies", { x: M + 0.28, y: TOP + 0.24, w: 5.0, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: LIME });
  s.addText(bullets([
    "Name, sector, website, contact details",
    "Search and filter the recruiter list",
    "Detail view lists every drive for that company",
    "Deleting a company cascades to its drives and their applications",
  ], { size: 12.5, gap: 12, lineSpacing: 17.5 }), { x: M + 0.28, y: TOP + 0.72, w: 5.0, h: 2.1, margin: 0, valign: "top" });
  card(s, M + 5.85, TOP, CW - 5.85, 3.05, CARD_HI);
  s.addText("Drives", { x: M + 6.13, y: TOP + 0.24, w: CW - 6.4, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: LIME });
  s.addText(bullets([
    "Role, package, minimum CGPA, drive date",
    "Eligible departments and eligible programs, per drive",
    "Application deadline, and an active/closed toggle",
    "Targets view: eligible students who have not applied yet",
    "Delete a drive and its applications in one action",
  ], { size: 12.5, gap: 12, lineSpacing: 17.5 }), { x: M + 6.13, y: TOP + 0.72, w: CW - 6.45, h: 2.1, margin: 0, valign: "top" });
  // closing band
  card(s, M, TOP + 3.35, CW, 1.25, "16382A");
  s.addText("The targets view is the quiet win:", {
    x: M + 0.3, y: TOP + 3.55, w: 3.4, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: LIME,
  });
  s.addText("for any drive, the cell can list the students who are eligible but have not applied — the actual follow-up list, computed by the same eligibility function that gates the student's Apply button. Placed students are excluded by the offer ladder.", {
    x: M + 3.8, y: TOP + 3.52, w: CW - 4.1, h: 0.9, margin: 0, fontFace: BODY, fontSize: 12, color: WHITE, lineSpacing: 17,
  });
  s.addNotes("The per-drive eligible programs and departments are what make one eligibility function work for every company — the rules are data attached to the drive, not code branches.");
}

// ================================================================ 22. TEACHER APPLICATIONS
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  4 OF 6",
    title: "Applications: decisions and history",
    sub: "Every status move appends an audit row and, where relevant, touches the offer table.",
  });
  // status pipeline
  const st = [["Applied", GREEN], ["Shortlisted", LIME], ["Selected", GREEN], ["Rejected", CORAL]];
  st.forEach((p, i) => {
    const w = (CW - 3 * 0.3) / 4;
    const x = M + i * (w + 0.3);
    card(s, x, TOP, w, 1.05, i % 2 === 0 ? CARD : CARD_HI);
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.24, y: TOP + 0.28, w: 0.16, h: 0.16, fill: { color: p[1] }, line: { color: p[1], width: 0 } });
    s.addText(p[0], { x: x + 0.5, y: TOP + 0.22, w: w - 0.7, h: 0.34, margin: 0, valign: "middle", fontFace: BODY, fontSize: 14, bold: true, color: WHITE });
    s.addText(["creates the first history row", "may add a note", "creates a placement record", "deletes any placement record"][i], {
      x: x + 0.24, y: TOP + 0.6, w: w - 0.48, h: 0.32, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED,
    });
  });
  card(s, M, TOP + 1.35, 6.4, 3.25);
  s.addText("List and detail", { x: M + 0.3, y: TOP + 1.57, w: 5.8, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets([
    "Filter by status, department and company",
    "Every row shows the live eligibility badge and its reason",
    "Detail page shows the student, the drive, and the full timeline",
    "Notes can be attached to a move, and appear in the history",
  ], { size: 12.5, gap: 12, lineSpacing: 17.5 }), { x: M + 0.3, y: TOP + 2.02, w: 5.8, h: 2.5, margin: 0, valign: "top" });
  card(s, M + 6.65, TOP + 1.35, CW - 6.65, 3.25, CARD_HI);
  s.addText("Why the badge matters here", { x: M + 6.93, y: TOP + 1.57, w: CW - 7.2, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(
    "The placement cell sees the same verdict the student saw. If a candidate is ineligible, the officer sees the identical reason string — not a different message produced by a second implementation of the rules.\n\n" +
    "When an application is marked selected, a placement record is created and the offer appears on the student's detail page. Walking the decision back removes it, so offers and statuses stay consistent.",
    { x: M + 6.93, y: TOP + 2.02, w: CW - 7.25, h: 2.4, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 16.5 }
  );
  s.addNotes("Two call sites of the eligibility function appear on this one screen: the badge on each row, and the underlying decision if the cell tries to act on an ineligible candidate.");
}

// ================================================================ 23. TEACHER STUDENT DETAIL
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  5 OF 6",
    title: "Student detail: applications and offers",
    sub: "The one screen where the cell corrects the package a student actually received.",
  });
  card(s, M, TOP, 6.4, 4.6);
  s.addText("What the officer sees", { x: M + 0.3, y: TOP + 0.24, w: 5.8, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets([
    "Profile: roll number, program, department, CGPA, phone, skills",
    "Every application with its current stage and eligibility reason",
    "The placement offers attached to this student",
    "The offered package, editable in place",
    "A delete path that cascades to their applications, history and offers",
  ], { size: 12.5, gap: 13, lineSpacing: 18 }), { x: M + 0.3, y: TOP + 0.74, w: 5.8, h: 3.5, margin: 0, valign: "top" });
  // offer editor mock
  card(s, M + 6.65, TOP, CW - 6.65, 4.6, CARD_HI);
  s.addText("Offer editor", { x: M + 6.93, y: TOP + 0.24, w: CW - 7.2, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText("PUT /api/admin/students/:id/offers/:rid", {
    x: M + 6.93, y: TOP + 0.58, w: CW - 7.2, h: 0.26, margin: 0, fontFace: "Courier New", fontSize: 10.5, color: GREEN,
  });
  const rows = [
    ["Nimbus Analytics", "Advertised", "8.5"],
    ["Nimbus Analytics", "Actual CTC", "9.2"],
  ];
  rows.forEach((r, i) => {
    const y = TOP + 1.05 + i * 0.86;
    s.addShape(pptx.ShapeType.roundRect, {
      x: M + 6.93, y, w: CW - 7.2, h: 0.72, fill: { color: CARD }, line: { color: HAIR, width: 0.75 }, rectRadius: 0.1,
    });
    s.addText(r[0], { x: M + 7.13, y: y + 0.08, w: 2.4, h: 0.26, margin: 0, fontFace: BODY, fontSize: 11.5, bold: true, color: WHITE });
    s.addText(r[1], { x: M + 7.13, y: y + 0.36, w: 2.4, h: 0.24, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });
    s.addText(r[2] + " LPA", { x: M + 9.7, y: y + 0.2, w: 1.4, h: 0.32, margin: 0, align: "right", fontFace: HEAD, fontSize: 15, bold: true, color: i === 1 ? LIME : MUTED });
  });
  s.addText(
    "The recorded CTC is what the ladder measures against, and what the dashboard's highest and average package figures use. Drives with no advertised package stay exempt until a figure is recorded.",
    { x: M + 6.93, y: TOP + 2.9, w: CW - 7.25, h: 1.5, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 16.5 }
  );
  s.addNotes("Advertised packages and actual CTCs differ once bonuses are settled — that is why the offer is a record with an editable figure rather than a copy of the drive's number.");
}

// ================================================================ 24. TEACHER NOTICES & EXPORT
{
  const s = base({
    kicker: "ADMIN PORTAL  ·  6 OF 6",
    title: "Notices, exports and account tools",
    sub: "The communication surface, plus the escape hatches offices genuinely need.",
  });
  const blocks = [
    ["Notices board", GREEN, ["Post an announcement with a title and body",
      "Visible to students on their home screen and notices list",
      "Delete a notice when it is stale",
      "The natural home for drive reminders and policy changes"]],
    ["CSV export", LIME, ["Students, companies, drives and applications",
      "Honours the filters currently applied",
      "Formula-prefixed cells neutralised for Excel and Sheets",
      "Lets the office keep its own reporting workflow"]],
    ["Accounts & self-service", AMBER, ["Change own password from any portal",
      "Reset a student's password, returning a fresh one-time value",
      "Admin account auto-seeded on first backend start",
      "Student logins auto-provisioned with the student record"]],
  ];
  blocks.forEach((b, i) => {
    const w = (CW - 2 * 0.34) / 3;
    const x = M + i * (w + 0.34);
    card(s, x, TOP, w, 4.6, i % 2 === 0 ? CARD : CARD_HI);
    glyph(s, x + 0.28, TOP + 0.3, 0.54, ["N", "C", "A"][i], { fill: b[1], fg: BG, size: 14 });
    s.addText(b[0], { x: x + 0.28, y: TOP + 1.0, w: w - 0.56, h: 0.34, margin: 0, fontFace: HEAD, fontSize: 16.5, bold: true, color: WHITE });
    s.addText(bullets(b[2], { size: 12, gap: 12, lineSpacing: 17 }), {
      x: x + 0.28, y: TOP + 1.46, w: w - 0.56, h: 2.9, margin: 0, valign: "top",
    });
  });
  s.addNotes("Export is not a nice-to-have: the placement office has to file reports to the university. The formula guard exists because those files get opened in Excel.");
}

// ================================================================ 25. FEATURE MATRIX
{
  const s = base({ kicker: "COMPARISON", title: "Feature matrix: who can do what", sub: "Role-checking is enforced server-side on every route, not by hiding buttons." });
  miniTable(
    s, M, TOP, CW,
    ["Capability", "Student", "Teacher / cell"],
    [
      ["Sign in, change own password", "Yes", "Yes"],
      ["Manage students, companies, drives, notices", "—", "Yes"],
      ["Browse drives", "Only those passing eligibility", "All, including inactive"],
      ["Apply to a drive", "One click, server-validated", "—"],
      ["See the ineligibility reason", "Yes, on the card", "Yes, as a badge"],
      ["Track application stage history", "Own applications", "Every application"],
      ["Read notices", "Yes", "Posts and deletes them"],
      ["Record / override an offer's CTC", "—", "Yes"],
      ["Offer ladder enforced", "Blocks their apply", "Excluded from targets view"],
      ["Import a cohort / export CSV", "—", "Yes"],
      ["Season analytics dashboard", "Personal counters only", "Full dashboard"],
    ],
    [5.2, 3.46, 3.47]
  );
  s.addNotes("Use this table if asked what exactly the student cannot do. The point is that the API enforces it — a student who crafts a request to an admin endpoint gets a 403 from the role decorator, not a hidden button.");
}

// ================================================================ 26. EVALUATION FUNCTIONAL
{
  const s = base({
    kicker: "EVALUATION  ·  1 OF 3",
    title: "Functional verification",
    sub: "A scripted integration suite drove the running application over real HTTP against a scratch database.",
  });
  stat(s, M, TOP, 2.9, 1.6, "23", "REST-level assertions in the development integration suite, passing before and after the performance work", { color: LIME, vsize: 40 });
  stat(s, M + 3.14, TOP, 2.9, 1.6, "2×", "The suite was run twice — the second run is the evidence that optimisation changed cost, not behaviour", { color: GREEN, vsize: 40 });
  stat(s, M + 6.28, TOP, 2.9, 1.6, "403", "Returned to a foreign origin, while the configured origin and header-less clients pass", { color: AMBER, vsize: 40 });
  card(s, M + 9.42, TOP, CW - 9.42, 1.6, CARD_HI);
  s.addText("Scratch DB", { x: M + 9.66, y: TOP + 0.28, w: CW - 9.9, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: LIME });
  s.addText("Created for the run and dropped afterwards — no demo data was touched.", {
    x: M + 9.66, y: TOP + 0.64, w: CW - 9.9, h: 0.7, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 14.5,
  });
  card(s, M, TOP + 1.86, CW, 2.74);
  s.addText("What the assertions covered", { x: M + 0.3, y: TOP + 2.06, w: 8, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  const cov = [
    "Admin login, then creating companies and drives",
    "Creating a student and retrieving the one-time password",
    "Student login with that password",
    "Portal drive listing and drive detail",
    "Applying to a drive",
    "The offer appearing when the application is marked selected",
    "The ladder refusing a lower-paying drive, with its reason",
    "The offer disappearing when the decision is walked back",
    "Dashboard figures reflecting the overridden CTC",
    "Cascade deletion of students, drives and companies, including history and offer rows",
    "The origin guard: 403 for a foreign origin, pass for the configured origin and header-less clients",
  ];
  const half = Math.ceil(cov.length / 2);
  [cov.slice(0, half), cov.slice(half)].forEach((col, ci) => {
    s.addText(bullets(col, { size: 11.5, gap: 8, lineSpacing: 14.5 }), {
      x: M + 0.3 + ci * 6.1, y: TOP + 2.5, w: 5.9, h: 2.0, margin: 0, valign: "top",
    });
  });
  s.addNotes("This is the answer to 'does it actually work'. It is not unit tests on helper functions; it drives the real HTTP surface, which is why it caught things like the offer not disappearing when a decision was reversed.");
}

// ================================================================ 27. PAYLOAD
{
  const s = base({
    kicker: "EVALUATION  ·  2 OF 3",
    title: "Client payload after code splitting",
    sub: "The charting library used to ride along with every route. Now it arrives on demand.",
  });
  s.addChart(
    pptx.ChartType.bar,
    [
      { name: "Before", labels: ["Entry, raw", "Entry, gzip"], values: [740, 206] },
      { name: "After", labels: ["Entry, raw", "Entry, gzip"], values: [336, 91] },
    ],
    {
      x: M, y: TOP, w: 7.3, h: 3.5, barDir: "col", barGapWidthPct: 60,
      showTitle: true, title: "Initial JavaScript payload (kB)", titleFontSize: 13, titleColor: WHITE, titleFontFace: BODY,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: WHITE, dataLabelFontFace: BODY,
      chartColors: [CORAL, GREEN],
      showLegend: true, legendPos: "b", legendFontSize: 11, legendColor: MUTED, legendFontFace: BODY,
      catAxisLabelColor: MUTED, catAxisLabelFontSize: 11, catAxisLabelFontFace: BODY,
      valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: BODY,
      valGridLine: { color: HAIR, size: 0.5 }, catGridLine: { style: "none" },
      valAxisMaxVal: 800,
      plotArea: { fill: { color: CARD } },
      chartArea: { fill: { color: CARD } },
    }
  );
  card(s, M + 7.65, TOP, CW - 7.65, 1.62, CARD_HI);
  s.addText("−55%", { x: M + 7.89, y: TOP + 0.16, w: CW - 7.9, h: 0.6, margin: 0, fontFace: HEAD, fontSize: 32, bold: true, color: LIME });
  s.addText("raw entry bundle;  −56% compressed", { x: M + 7.89, y: TOP + 0.82, w: CW - 7.9, h: 0.6, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
  card(s, M + 7.65, TOP + 1.86, CW - 7.65, 1.64, CARD);
  s.addText("404 kB", { x: M + 7.89, y: TOP + 2.0, w: CW - 7.9, h: 0.6, margin: 0, fontFace: HEAD, fontSize: 30, bold: true, color: AMBER });
  s.addText("dashboard chunk (114 kB gzip), fetched once on first visit and cached by the browser", {
    x: M + 7.89, y: TOP + 2.64, w: CW - 7.9, h: 0.72, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15,
  });
  card(s, M, TOP + 3.7, CW, 0.9, "16382A");
  s.addText("Every route other than the dashboard now paints from the smaller entry chunk, and the dashboard is loaded through a dynamic import with a suspense fallback.", {
    x: M + 0.3, y: TOP + 3.86, w: CW - 0.6, h: 0.6, margin: 0, fontFace: BODY, fontSize: 12, color: WHITE, lineSpacing: 17,
  });
  s.addNotes("The measurement is objective — it is the build output. Screens were re-checked afterwards to confirm nothing looked different.");
}

// ================================================================ 28. QUERIES
{
  const s = base({
    kicker: "EVALUATION  ·  3 OF 3",
    title: "Database queries per request",
    sub: "Three list endpoints were doing per-row work. Each now issues a constant number of queries.",
  });
  miniTable(
    s, M, TOP, 7.5,
    ["Endpoint", "Before", "After"],
    [
      ["Drives list", "N + 2", "3"],
      ["Applications list", "3N + 1", "1"],
      ["Student detail", "≈2N + 4", "constant"],
      ["Companies list", "N + 1", "2"],
    ],
    [3.1, 2.2, 2.2]
  );
  card(s, M + 7.88, TOP, CW - 7.88, 2.4, CARD_HI);
  s.addText("How", { x: M + 8.12, y: TOP + 0.24, w: CW - 8.15, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(bullets([
    "Joined eager loads for row data",
    "One grouped aggregate for counts",
    "Scalar column queries for dashboard figures",
  ], { size: 11.5, gap: 10, lineSpacing: 15.5 }), { x: M + 8.12, y: TOP + 0.66, w: CW - 8.2, h: 1.6, margin: 0, valign: "top" });
  card(s, M, TOP + 2.7, CW, 1.9, "16382A");
  s.addText("Why it matters on this deployment", { x: M + 0.3, y: TOP + 2.9, w: 6, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: LIME });
  s.addText(
    "The API runs on a serverless host against Neon, a serverless Postgres whose compute and storage are separated. Every request pays connection setup to a remote database, so removing dozens of round trips per page load is worth more than micro-optimising any single query. N is the number of rows returned.",
    { x: M + 0.3, y: TOP + 3.3, w: CW - 0.6, h: 1.2, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 17 }
  );
  s.addNotes("Be honest that these are counts from one development machine, not a distributed benchmark. The payload numbers are exact; the query numbers are structural — N-plus-one became constant.");
}

// ================================================================ 29. LIMITATIONS
{
  const s = base({
    kicker: "LIMITATIONS",
    title: "What this does not do yet",
    sub: "The gaps I would expect you to find, stated before you find them.",
  });
  const lim = [
    ["Unbounded lists", "List endpoints return everything; real pagination is needed as a cohort approaches the importer's 5 000-row ceiling."],
    ["No login rate limiting", "Tolerable for a campus tool behind institutional access; not sufficient for a public service."],
    ["UI logout leaves the cookie", "Signing out clears the client state but does not yet call the logout endpoint, so the session cookie stays valid until it expires."],
    ["Tests are on demand", "The integration suite is development-owned and not yet wired into continuous integration, so its guarantee depends on it being run."],
    ["Analytics are descriptive", "Package averages use every offer record rather than one best offer per student, and the funnel is a current-state snapshot, not a round-by-round conversion."],
    ["Ladder trusts the advertised package", "Until the cell overrides it, an inflated listing can temporarily admit students the rule would otherwise exclude."],
  ];
  lim.forEach((l, i) => {
    const w = (CW - 0.36) / 2;
    const x = M + (i % 2) * (w + 0.36);
    const y = TOP + Math.floor(i / 2) * 1.55;
    card(s, x, y, w, 1.38, i % 2 === 0 ? CARD : CARD_HI);
    glyph(s, x + 0.26, y + 0.26, 0.42, "!", { fill: AMBER, fg: BG, size: 13 });
    s.addText(l[0], { x: x + 0.84, y: y + 0.24, w: w - 1.1, h: 0.32, margin: 0, fontFace: BODY, fontSize: 13.5, bold: true, color: WHITE });
    s.addText(l[1], { x: x + 0.26, y: y + 0.68, w: w - 0.52, h: 0.62, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 14.5 });
  });
  s.addNotes(
    "I would rather raise these than be caught by them. The two I would fix first are the logout cookie and rate limiting.\n\n" +
    "On the programme configuration: this was developed as a BCA project, but the current prototype's student records and programme list are configured for B.Tech, which is what the seeded demonstration data reflects. The engine takes eligible programs and departments per drive as data, so adding BCA is a configuration change rather than a code change — but I want to be clear that the running prototype today is a B.Tech cohort."
  );
}

// ================================================================ 30. FUTURE WORK
{
  const s = base({ kicker: "FUTURE WORK", title: "Where the project goes next", sub: "Ordered by what the deployment actually needs first." });
  const items = [
    ["Server-side pagination", "Keeps list endpoints predictable as cohorts grow", GREEN, "Next"],
    ["Logout invalidates the session", "Call the logout endpoint from the UI so signing out ends the cookie", GREEN, "Next"],
    ["Login rate limiting", "Closes the remaining security gap before any public exposure", GREEN, "Next"],
    ["Resume upload", "Attach a CV to the student record so the cell stops chasing email attachments", LIME, "Then"],
    ["Notifications from history", "Drive the audit table into student notifications, so nobody misses a deadline", LIME, "Then"],
    ["Skill-based matching", "Match student skill profiles against drive requirements to suggest drives", AMBER, "Later"],
  ];
  items.forEach((it, i) => {
    const y = TOP + i * 0.88;
    card(s, M, y, CW, 0.76, i % 2 === 0 ? CARD : CARD_HI);
    glyph(s, M + 0.24, y + 0.16, 0.44, String(i + 1), { fill: it[2], fg: BG, size: 12 });
    s.addText(it[0], { x: M + 0.84, y: y + 0.1, w: 4.1, h: 0.56, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13.5, bold: true, color: WHITE });
    s.addText(it[1], { x: M + 5.1, y: y + 0.1, w: CW - 7.4, h: 0.56, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5, color: MUTED });
    s.addShape(pptx.ShapeType.roundRect, {
      x: M + CW - 1.5, y: y + 0.19, w: 1.2, h: 0.38, fill: { color: "16382A" }, line: { color: HAIR, width: 0.75 }, rectRadius: 0.19,
    });
    s.addText(it[3], { x: M + CW - 1.5, y: y + 0.26, w: 1.2, h: 0.26, margin: 0, align: "center", fontFace: BODY, fontSize: 10.5, bold: true, color: it[2] });
  });
  s.addNotes("Each of these follows directly from a limitation on the previous slide — that ordering is deliberate, not a wish list.");
}

// ================================================================ 31. CONCLUSION
{
  const s = base({
    kicker: "CONCLUSION",
    title: "What was built, and what it demonstrates",
  });
  const cols = [
    ["The system", GREEN, [
      "Two working portals over one role-guarded REST API",
      "Six core tables plus an offer table and an audit table",
      "Deployed on Vercel against Neon serverless Postgres",
    ]],
    ["The contribution", LIME, [
      "Eligibility concentrated in one server-side function with four call sites",
      "An offer ladder backed by automatically maintained placement records",
      "An append-only history that makes every decision replayable",
    ]],
    ["The engineering", AMBER, [
      "A development integration suite of 23 REST-level assertions",
      "Entry payload cut from 740 kB to 336 kB (−56% compressed)",
      "Per-row database work replaced by joins and grouped aggregates",
    ]],
  ];
  cols.forEach((c, i) => {
    const w = (CW - 0.72) / 3;
    const x = M + i * (w + 0.36);
    card(s, x, TOP, w, 3.5, i % 2 === 0 ? CARD : CARD_HI);
    s.addText(c[0], { x: x + 0.3, y: TOP + 0.28, w: w - 0.6, h: 0.36, margin: 0, fontFace: HEAD, fontSize: 18, bold: true, color: c[1] });
    s.addText(bullets(c[2], { size: 12.5, gap: 14, lineSpacing: 18 }), {
      x: x + 0.3, y: TOP + 0.84, w: w - 0.6, h: 2.5, margin: 0, valign: "top",
    });
  });
  card(s, M, TOP + 3.78, CW, 0.84, "16382A");
  s.addText("PlaceMate replaces the spreadsheet season with a system whose rules live in one place, whose offers are recorded as data, and whose decisions can be replayed from a log.", {
    x: M + 0.3, y: TOP + 3.94, w: CW - 0.6, h: 0.54, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13, italic: true, color: WHITE,
  });
  s.addNotes("Close on the one-sentence version, then hand over to questions.");
}

// ================================================================ 32. THANK YOU
{
  pageNo += 1;
  const s = pptx.addSlide();
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.ellipse, { x: 8.6, y: -2.2, w: 7.0, h: 7.0, fill: { color: "1B4632" }, line: { color: "1B4632", width: 0 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 10.9, y: 3.4, w: 5.2, h: 5.2, fill: { color: "16382A" }, line: { color: "16382A", width: 0 } });
  s.addText("Thank you", { x: M, y: 2.3, w: 8, h: 0.94, margin: 0, fontFace: HEAD, fontSize: 48, bold: true, color: WHITE });
  s.addText("Questions and demonstration", {
    x: M, y: 3.3, w: 8, h: 0.42, margin: 0, fontFace: BODY, fontSize: 19, color: LIME,
  });
  s.addText(
    "Tushar Kumar  ·  Department of Computer Applications (BCA)\nMaharaja Surajmal Institute, C-4 Janakpuri, New Delhi – 110058\nAffiliated to Guru Gobind Singh Indraprastha University, Delhi",
    { x: M, y: 4.02, w: 8.4, h: 1.1, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 19 }
  );
  s.addText("A live walkthrough of both portals is available on request.", {
    x: M, y: 5.4, w: 8, h: 0.34, margin: 0, fontFace: BODY, fontSize: 12, italic: true, color: "5C7A6B",
  });
  s.addNotes("Invite questions and offer the live demo. Likely questions: why no self-registration, how the ladder increment is configured, and whether the rules can differ per company — all three are answered in the design section.");
}

pptx.writeFile({ fileName: __dirname + "/PlaceMate_Presentation.pptx" }).then((f) => {
  console.log("written", f, "slides:", pageNo);
});
