import type { ProjectSceneId } from "@/components/Artwork";
export type Project = {
  slug: ProjectSceneId;
  title: string;
  descriptor: string;
  category: string;
  hook: string;
  summary: string;
  number: string;
  year?: string;
  role: string;
  team?: string;
  status: string;
  stack: string[];
  link?: { label: string; url: string };
  context: string;
  problem: string;
  contribution: string;
  decisions: { title: string; body: string }[];
  challenge: string;
  result: string;
  diagram: { nodes: string[]; caption: string };
  /** Real screens from the product, shown on its case study. */
  shots?: Shot[];
  /** One line on where the screens come from. */
  shotsNote?: string;
};
export type Shot = {
  src: string;
  width: number;
  height: number;
  kind: "phone" | "web";
  alt: string;
  label: string;
  caption: string;
  /** The page's address, shown in the browser frame of a web shot. */
  address?: string;
};
/*
 * Written in the first person and kept to what is known. Where something
 * has not been measured or is not public (accuracy figures, a production
 * rollout, who owns which component), the copy says so plainly instead of
 * implying it. See CONTENT-SOURCES.md for the evidence behind each claim.
 */
export const projects: Project[] = [
  {
    slug: "mygym",
    title: "MyGym",
    descriptor: "Gym management platform",
    category: "FULL-STACK PLATFORM",
    number: "01",
    year: "2026",
    hook: "Gyms run on handovers,\nand handovers lose things.",
    summary:
      "A platform that runs a gym’s whole member journey, from the first enquiry through to coaching and progress.",
    role: "Full-stack developer",
    team: "Team of three",
    status: "Demoed to a first client · Getting ready for a pilot",
    stack: [
      "Next.js",
      "Expo / React Native",
      "NestJS",
      "PostgreSQL",
      "Prisma",
      "TypeScript",
    ],
    link: { label: "Visit mygym.co.in", url: "https://mygym.co.in" },
    context:
      "A new member passes through a lot of hands before their first workout. A DM or a walk-in becomes a lead, then a consult, a sale, member setup, coaching and weekly check-ins. MyGym puts all of those steps in one system.",
    problem:
      "When leads, consultations, payments and workout plans sit in separate tools, the member’s history doesn’t travel with them. Staff end up copying details from one place to another when they could be acting on them. We wanted the person to stay connected to every stage.",
    contribution:
      "I’m one of three developers on MyGym. My part covers the member and trainer dashboards, attendance and reporting, workout validation, the chat assistants and diet planning. The platform as a whole is a team effort, so the architecture on this page is what we built together. I’m not claiming every piece of it as mine.",
    decisions: [
      {
        title: "One record follows the member",
        body: "Enquiry, consultation, sale, payment, onboarding, coaching and progress are linked records in the same database. When a coach opens a new member, they see the sale that was actually made. Nobody has to retype it.",
      },
      {
        title: "The API decides what’s allowed",
        body: "The web app for the front desk is Next.js, and the Android and iPhone apps are Expo. They all talk to one NestJS API, and that API owns the business rules and permissions. No client gets to decide on its own what a user can do. PostgreSQL and Prisma sit underneath.",
      },
      {
        title: "Each role gets its own workspace",
        body: "Owners, front-desk staff, coaches and members each see their own part of the journey. An owner gets sales and payments at a glance, and a member gets their plan and their coach’s replies. The system enforces those boundaries. We didn’t build one big dashboard and hide parts of it.",
      },
      {
        title: "Fail loudly before showing a wrong number",
        body: "Responses are validated at runtime and malformed ones are rejected. Requests are tracked and cancelled, so a slow response for one member can’t turn up after you’ve switched to another. That matters most on the screens that deal with payments.",
      },
    ],
    challenge:
      "The hard part was keeping every view of the same person trustworthy. A screen can look fine while it’s showing stale data, or a value that should never have got through. A request coming back successfully isn’t proof the data is right, so we handle those cases on purpose.",
    result:
      "We demoed the whole thing end to end to a prospective first client: web app, mobile app, API, database, seeded demo data and automated tests. Next is hardening it for a controlled pilot. It isn’t in production yet, and I don’t want this page to suggest it is.",
    diagram: {
      nodes: [
        "Web console / Next.js",
        "Mobile / Expo",
        "Rules & roles / NestJS API",
        "Linked records / PostgreSQL + Prisma",
      ],
      caption:
        "The web and mobile apps share one API for rules and permissions, on top of a relational database.",
    },
    shotsNote:
      "From the mobile app, running on seeded demo data. The names and figures aren’t real customers.",
    shots: [
      {
        src: "/shots/mygym-owner-overview.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym owner overview listing how many people are at each stage, from new lead to joined.",
        label: "Owner",
        caption: "How sales are going, stage by stage.",
      },
      {
        src: "/shots/mygym-owner-payments.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym payments screen showing the amount sold, how much is paid and how much is still owed, with a list of sales.",
        label: "Owner",
        caption: "What’s paid and what’s still owed.",
      },
      {
        src: "/shots/mygym-front-desk.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym front desk home with buttons to add a lead or book a consult, and a list of follow-ups that need attention.",
        label: "Front desk",
        caption: "Today’s follow-ups and bookings.",
      },
      {
        src: "/shots/mygym-coach-reviews.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym coach reviews screen listing member check-ins and form questions waiting for a reply.",
        label: "Coach",
        caption: "Check-ins and form questions to review.",
      },
      {
        src: "/shots/mygym-member-today.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym member home screen with today’s stats and the current workout plan.",
        label: "Member",
        caption: "Today’s snapshot and workout.",
      },
      {
        src: "/shots/mygym-member-plan.webp",
        width: 760, height: 1646, kind: "phone",
        alt: "MyGym member plan screen showing a three-day strength plan with exercises, sets and notes.",
        label: "Member",
        caption: "The plan, with a button to ask the coach.",
      },
    ],
  },
  {
    slug: "vanicert",
    title: "VaniCert",
    descriptor: "Voice deepfake detection",
    category: "APPLIED AI · AUDIO",
    number: "02",
    hook: "A cloned voice sounds\nlike the real one.",
    summary:
      "A tool that checks whether a voice recording is real or AI-generated, using a neural anti-spoofing model alongside classical signal processing.",
    role: "Contributing engineer",
    team: "Shubhang Varda · Saran Chekka · Tamish Sridatta Billa",
    status: "Public analyser is live",
    stack: ["FastAPI", "AASIST", "Silero VAD", "Modal GPU", "DSP"],
    link: { label: "Open VaniCert", url: "https://vanicert.vercel.app" },
    context:
      "Voice cloning is good enough now that recognising someone’s voice no longer tells you it’s them. VaniCert takes an audio sample and returns a verdict, with the information that supports it.",
    problem:
      "Real recordings are messy. There’s silence, background noise, and speech in separate stretches. If you only look at a small sample you can miss the part that matters. So the pipeline finds the speech first, then checks it in more than one way.",
    contribution:
      "I worked on VaniCert with Saran Chekka and Tamish Sridatta Billa, and all three of us are credited on the live site. We haven’t published who owns which component, so what I describe here is the team’s system.",
    decisions: [
      {
        title: "Find the speech first",
        body: "Silero VAD runs over the whole recording and picks out the stretches of speech. Everything after that works on speech only, with the silence and non-speech segments set aside.",
      },
      {
        title: "Two kinds of evidence",
        body: "AASIST gives a neural anti-spoofing signal. Separately, classical DSP checks look at features like MFCCs, spectral centroid and spectral flux. The two are brought together into a consensus before a verdict comes back.",
      },
      {
        title: "The model runs on a GPU server",
        body: "FastAPI exposes the analysis endpoint and the model runs on GPUs through Modal. None of the heavy inference happens in your browser.",
      },
    ],
    challenge:
      "Analysing the full recording takes time. The live site says so up front: there are cold starts, and long recordings take longer. We chose to cover the whole recording even though it means the answer isn’t instant.",
    result:
      "The analyser is public and you can try it. We haven’t published an evaluation, so I’m not quoting accuracy, latency or false-positive numbers. The waveform on this page is an illustration of the pipeline. It isn’t output from the model.",
    diagram: {
      nodes: [
        "Audio stream",
        "Silero VAD / Speech isolation",
        "AASIST + DSP / Parallel analysis",
        "Consensus / Classification",
      ],
      caption:
        "Speech is isolated first, then analysed by the neural model and the DSP checks, which together inform the verdict.",
    },
    shots: [
      {
        src: "/shots/vanicert.webp",
        width: 1920, height: 1200, kind: "web",
        address: "vanicert.vercel.app",
        alt: "The VaniCert home page, headed Separate Real Voices From Synthetic Clones, with a button to launch the analyser.",
        label: "Home page",
        caption: "The analyser is one click from here.",
      },
    ],
  },
  {
    slug: "firstdrop-ai",
    title: "FirstDropAI",
    descriptor: "HealthCareSim · Clinical communication",
    category: "CONVERSATIONAL AI",
    number: "03",
    year: "2026",
    hook: "Hard conversations\nneed rehearsal too.",
    summary:
      "A simulator where trainee doctors practise difficult conversations with AI patients, families and nurses, set in Indian healthcare.",
    role: "Technology Consultant · First Drop Theatre",
    team: "Solo build",
    status: "Built for First Drop Theatre · Live",
    stack: [
      "Next.js",
      "TypeScript",
      "Gemini API",
      "Speech-to-text",
      "Text-to-speech",
      "Prompt design",
    ],
    link: {
      label: "Open HealthCareSim",
      url: "https://health-care-sim.vercel.app",
    },
    context:
      "Knowing the medicine and being able to talk to a frightened family are different skills. HealthCareSim gives trainee doctors somewhere to practise the second one, through roleplay with simulated patients, family members and nurses.",
    problem:
      "A difficult conversation doesn’t follow a script. Emotion, tension, language and family dynamics all change what happens next. For the practice to be worth anything, the simulation has to react to those things.",
    contribution:
      "I built this on my own, as Technology Consultant at First Drop Theatre. That covers scenario generation, the conversation flow, voice input and output, and a feedback report on empathy, clarity, listening and handling pressure.",
    decisions: [
      {
        title: "Set the scene before anyone speaks",
        body: "You start from one rough idea: the patient, the pressure point and the skill you want to practise. The app turns that into a structured brief you can edit before you begin. I wrote the prompts for clinical realism in Indian settings. A chatbot that agrees with everything would be no use here.",
      },
      {
        title: "The room reacts to what you say",
        body: "The simulation keeps track of how tense the conversation is and uses that to shape the next response. Patients, family members and nurses each play a different part in the scenario.",
      },
      {
        title: "End with something to reflect on",
        body: "You can dictate your replies and have the messages read aloud, so the practice can be spoken like the real thing. Afterwards you get scored feedback on how you communicated, which gives the trainee something specific to think about.",
      },
    ],
    challenge:
      "The hard part is making the conversation believable. It needs pressure and shifting dynamics, and it still has to hold together as one scenario. The feedback is for practice. It hasn’t been clinically validated and I’m not claiming it improves patient outcomes.",
    result:
      "It’s live and runs in the browser with no sign-up. The whole app also works in Hindi. It’s a training simulation only, and says so on the page: it isn’t for diagnosis or treatment.",
    diagram: {
      nodes: [
        "Scenario / People & context",
        "Roleplay / Conversation",
        "Tension / Respond & adapt",
        "Reflection / Session report",
      ],
      caption:
        "A scenario sets up the conversation, tension shapes how it goes, and a report closes the session.",
    },
    shots: [
      {
        src: "/shots/healthcaresim.webp",
        width: 1920, height: 1200, kind: "web",
        address: "health-care-sim.vercel.app",
        alt: "The HealthCareSim start page, headed A training room for difficult conversations, with a sample exchange between a family member and a trainee.",
        label: "Start page",
        caption:
          "A sample roleplay on the right, and the four skills it trains below.",
      },
    ],
  },
  {
    slug: "bhashabuddy",
    title: "BhashaBuddy",
    descriptor: "Mother-tongue learning",
    category: "LANGUAGE · LEARNING",
    number: "04",
    hook: "A family language is easy\nto lose growing up abroad.",
    summary:
      "A language-learning app for children growing up away from the language their family speaks.",
    role: "Product engineering",
    status: "Live on the web",
    stack: ["React", "Vite", "Supabase", "OpenAI API", "Text-to-speech"],
    link: {
      label: "Open BhashaBuddy",
      url: "https://parampara-one.vercel.app/",
    },
    context:
      "For a child growing up abroad, the family language is the way into the people, stories and culture that come with it. BhashaBuddy gives them a friendly place to practise.",
    problem:
      "With young children the hard part is attention. A vocabulary list won’t hold it. So the app mixes stories, games, conversation and pronunciation feedback.",
    contribution:
      "I worked on BhashaBuddy as a product engineer, on the interactive learning side and the AI-supported language practice.",
    decisions: [
      {
        title: "Several ways in",
        body: "There are four activities: lessons built from YouTube videos, a voice coach, a story builder and word games. Each gives a child a different way to practise. The screen shows activities. The AI tools underneath stay out of sight.",
      },
      {
        title: "Practice in the family’s own language",
        body: "The voice coach listens as the child speaks and scores their pronunciation. The story builder writes a story from any idea, with a comprehension quiz at the end. The live app offers Hindi, Tamil, Telugu, Kannada, Malayalam and English.",
      },
      {
        title: "Parents can see how it’s going",
        body: "Supabase handles the data, and AI and speech services run the activities. A parent dashboard shows daily minutes, skill scores and a weekly report written by AI.",
      },
    ],
    challenge:
      "The main challenge is a teaching one: keeping a young child engaged. That’s what the design is aiming for. I don’t have data on learning outcomes or retention, so I’m not making claims about either.",
    result:
      "The app is live on Vercel. The artwork on this page uses letters from the languages as decoration. It isn’t a screenshot of the product.",
    diagram: {
      nodes: [
        "Stories & games",
        "Conversation practice",
        "Speech / Pronunciation",
        "Progress / Parent view",
      ],
      caption:
        "The learning activities connect to speech practice and to a view of progress.",
    },
    shots: [
      {
        src: "/shots/bhashabuddy.webp",
        width: 1920, height: 1200, kind: "web",
        address: "parampara-one.vercel.app",
        alt: "The BhashaBuddy home page, headed Language feels like a friend, with language choices and a story player showing a story in Tamil.",
        label: "Home page",
        caption: "The story player on the right is reading a story in Tamil.",
      },
    ],
  },
  {
    slug: "posture-engine",
    title: "Posture Engine",
    descriptor: "& Diet Planner · MyGym",
    category: "COMPUTER VISION",
    number: "05",
    year: "JUN 2025 — JAN 2026",
    hook: "A rep count doesn’t say\nif the form was right.",
    summary:
      "Pose estimation that checks workout form and counts reps, plus an AI diet planner built on Indian food data.",
    role: "Full-stack & AI engineering",
    team: "Solo, within MyGym",
    status: "Feature work for MyGym",
    stack: ["React", "Flask", "MediaPipe", "OpenCV", "MongoDB Atlas", "Figma"],
    context:
      "This is work I did inside MyGym. It helps members and trainers understand movement, count repetitions, and work with food plans made for the person.",
    problem:
      "Counting reps tells you very little about form. And a diet plan is only useful if it accounts for the person’s goals, their allergies, and food they’re used to eating. These are two separate needs that happen to live in the same fitness app.",
    contribution:
      "I built the posture validation engine, the diet planner and an in-app assistant on my own. I also redesigned the dashboards, trainer pages and live-session screens.",
    decisions: [
      {
        title: "From landmarks to feedback",
        body: "MediaPipe and OpenCV estimate the pose and track the joints. Joint angles and movement phases then give the rep count and the form feedback.",
      },
      {
        title: "Diet planning from real inputs",
        body: "The diet engine works from the person’s goals, their allergies and an Indian food database. It’s a separate feature from the pose model.",
      },
      {
        title: "Screens people can use",
        body: "The interfaces are React, the services are Flask, and the data is in MongoDB. The dashboards and live-session screens are where members and trainers meet these features.",
      },
    ],
    challenge:
      "This project puts real-time visual feedback next to ordinary app screens. The poses on this page are scripted illustrations. The page doesn’t ask for your camera, and what you see isn’t live model output.",
    result:
      "I worked on this from June 2025 to January 2026 as part of MyGym. It doesn’t have its own public deployment. I’m not making claims here about fitness results, nutrition results or model accuracy.",
    diagram: {
      nodes: [
        "Camera / Frames",
        "MediaPipe / Landmarks",
        "Joint angles / Form",
        "Movement phases / Repetitions",
      ],
      caption:
        "Camera frames become landmarks, landmarks become joint angles, and those give form feedback and rep counts. Diet planning is separate and works from goals, allergies and food data.",
    },
  },
];
export const getProject = (slug: string) =>
  projects.find((p) => p.slug === slug);
