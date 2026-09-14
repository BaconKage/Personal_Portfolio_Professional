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
};
export const projects: Project[] = [
  {
    slug: "mygym",
    title: "MyGym",
    descriptor: "Gym Operating System",
    category: "FULL-STACK PLATFORM",
    number: "01",
    year: "2026",
    hook: "One member.\nOne connected system.",
    summary:
      "A gym operating platform that connects the entire member lifecycle, from the first enquiry to coaching and progress.",
    role: "Full-Stack Developer",
    team: "Team of three",
    status: "Client demonstration complete · Preparing for controlled pilot",
    stack: [
      "Next.js",
      "Expo / React Native",
      "NestJS",
      "PostgreSQL",
      "Prisma",
      "TypeScript",
    ],
    link: { label: "Visit product website", url: "https://mygym.co.in" },
    context:
      "A gym is a collection of handovers. Someone enquires, speaks to sales, buys a package, pays, and starts working with a coach. MyGym brings those handovers into one operating platform.",
    problem:
      "When leads, consultations, payments, and workout plans live in disconnected tools, the member’s context gets lost. Staff end up copying information rather than acting on it. The challenge is keeping the person connected to every stage.",
    contribution:
      "I am a core developer in a team of three. My documented work includes member and trainer dashboards, attendance and reporting, workout validation, conversational assistants, and diet planning. The current operating platform is a team delivery; its architecture is described here as the system we built, without attributing every component to me alone.",
    decisions: [
      {
        title: "A lifecycle, not a collection of forms.",
        body: "Enquiry, consultation, sale, payment, onboarding, coaching, and progress share linked domain records. A coach receives the context of the actual sale rather than a second copy of it.",
      },
      {
        title: "One authority. Two clients.",
        body: "The Next.js web console and Expo mobile application use a NestJS API that owns business rules and permissions. PostgreSQL and Prisma support the connected domain model. The clients do not independently decide what is allowed.",
      },
      {
        title: "Different workspaces. Shared facts.",
        body: "Sales, finance, coaches, members, and managers see the parts of the lifecycle relevant to their responsibilities. Role boundaries are part of the system rather than a visual filter on a universal dashboard.",
      },
      {
        title: "A visible failure beats a wrong number.",
        body: "Runtime validation rejects malformed responses. Request tracking and cancellation prevent a delayed response for one member from appearing after the interface switches to another. Correctness matters most where the information affects payments and people.",
      },
    ],
    challenge:
      "The difficult part was preserving trust between views of the same person. A screen can look correct while showing a stale response or an invalid value. The implementation addresses those failure modes explicitly instead of treating a successful request as sufficient evidence of correctness.",
    result:
      "The web application, mobile application, API, database, seeded demonstration data, and automated tests were demonstrated end to end to a prospective first client. The documented next step is hardening for a controlled pilot. A successful demonstration is not presented as proof of a production rollout.",
    diagram: {
      nodes: [
        "Web console / Next.js",
        "Mobile / Expo",
        "Rules & roles / NestJS API",
        "Linked records / PostgreSQL + Prisma",
      ],
      caption:
        "Web and mobile clients share one API for rules and permissions, backed by a connected relational database.",
    },
  },
  {
    slug: "vanicert",
    title: "VaniCert",
    descriptor: "Voice Authenticity Detection",
    category: "APPLIED AI · AUDIO",
    number: "02",
    hook: "A voice is a signal.\nTrust takes more.",
    summary:
      "Voice deepfake detection combining neural anti-spoofing analysis with classical signal processing.",
    role: "Contributing engineer",
    team: "Shubhang Varda · Saran Chekka · Tamish Sridatta Billa",
    status: "Public analyzer available",
    stack: ["FastAPI", "AASIST", "Silero VAD", "Modal GPU", "DSP"],
    link: { label: "Open VaniCert", url: "https://vanicert.vercel.app" },
    context:
      "Cloned speech makes a familiar voice an unreliable signal of authenticity. VaniCert analyses an audio sample and returns a classification with supporting information.",
    problem:
      "An audio file can contain silence, background noise, and different stretches of speech. Looking only at a superficial sample can miss relevant detail. The pipeline is designed around isolating speech and comparing more than one analytical signal.",
    contribution:
      "I contributed to VaniCert alongside Saran Chekka and Tamish Sridatta Billa, both credited on the live project. The public portfolio documents the overall pipeline but does not divide individual component ownership, so this case study describes the team’s system.",
    decisions: [
      {
        title: "Start with speech.",
        body: "Silero VAD isolates speech across the input stream before downstream analysis. This separates the material of interest from silence and non-speech segments.",
      },
      {
        title: "Compare different kinds of evidence.",
        body: "AASIST provides a neural anti-spoofing signal. Classical DSP checks examine features including MFCCs, spectral centroid, and spectral flux. The documented consensus approach brings these analyses together before returning a verdict.",
      },
      {
        title: "Put the workload where it belongs.",
        body: "FastAPI exposes the analysis interface, with GPU-backed execution on Modal. This keeps intensive model inference outside the browser.",
      },
    ],
    challenge:
      "Inspecting a full stream has a cost. The live project explicitly acknowledges cold starts and longer processing for lengthy recordings. The engineering tradeoff is coverage of the recording rather than the appearance of an instantaneous response.",
    result:
      "A public analyzer is available. This portfolio makes no accuracy, latency, or false-positive claims without a published evaluation. The waveform artwork is a conceptual view of the pipeline, not an inference result.",
    diagram: {
      nodes: [
        "Audio stream",
        "Silero VAD / Speech isolation",
        "AASIST + DSP / Parallel analysis",
        "Consensus / Classification",
      ],
      caption:
        "Speech isolation feeds neural and DSP analysis, which inform the final classification.",
    },
  },
  {
    slug: "firstdrop-ai",
    title: "FirstDropAI",
    descriptor: "HealthCareSim · Clinical Communication",
    category: "CONVERSATIONAL AI",
    number: "03",
    year: "2026",
    hook: "Rehearse the conversation.\nBefore it matters.",
    summary:
      "An AI clinical communication simulator for practising difficult conversations in Indian healthcare settings.",
    role: "Technology Consultant · First Drop Theatre",
    team: "Solo build, as documented",
    status: "Built for First Drop Theatre",
    stack: [
      "Next.js",
      "TypeScript",
      "Gemini API",
      "Speech-to-text",
      "Text-to-speech",
      "Prompt design",
    ],
    link: {
      label: "Visit First Drop Theatre",
      url: "https://firstdroptheatre.com",
    },
    context:
      "Clinical knowledge and communication are different skills. HealthCareSim gives trainee doctors a roleplay environment with simulated patients, family members, and nurses.",
    problem:
      "A difficult conversation does not follow a tidy question-and-answer script. Emotion, tension, language, and family dynamics affect what happens next. A useful rehearsal needs to respond to those pressures.",
    contribution:
      "I engineered scenario generation, the conversational simulation flow, voice input and output, and feedback reports covering empathy, clarity, listening, and composure. The work is documented as a solo build in my role at First Drop Theatre.",
    decisions: [
      {
        title: "Give the conversation a context.",
        body: "Generated scenarios set up the people and situation before the roleplay begins. Prompt design focuses on clinical realism and Indian settings, rather than a uniformly agreeable chatbot.",
      },
      {
        title: "Let the room react.",
        body: "The simulation tracks conversational tension and uses the evolving exchange to shape its responses. Patients, families, and nurses have different roles within the scenario.",
      },
      {
        title: "Close the rehearsal loop.",
        body: "Voice interaction supports spoken practice. A session report provides feedback on the communication dimensions documented in the project, turning an exchange into something the trainee can reflect on.",
      },
    ],
    challenge:
      "The challenge is conversational credibility: creating an exchange with pressure and changing dynamics while keeping the scenario coherent. The project’s feedback is part of a practice tool; no clinical validation or improvement in patient outcomes is claimed here.",
    result:
      "The documented build includes scenario generation, roleplay, voice interaction, and session feedback. The external link leads to First Drop Theatre, the organisation, because a public simulator URL has not been supplied.",
    diagram: {
      nodes: [
        "Scenario / People & context",
        "Roleplay / Conversation",
        "Tension / Respond & adapt",
        "Reflection / Session report",
      ],
      caption:
        "A scenario frames the conversation; tension informs the exchange; the session ends with structured feedback.",
    },
  },
  {
    slug: "bhashabuddy",
    title: "BhashaBuddy",
    descriptor: "Mother-Tongue Learning",
    category: "LANGUAGE · LEARNING",
    number: "04",
    hook: "A language can feel\nlike coming home.",
    summary:
      "An interactive language-learning app for children growing up away from their family’s mother tongue.",
    role: "Product engineering",
    status: "Public application available",
    stack: ["React", "Vite", "Supabase", "OpenAI API", "Text-to-speech"],
    link: {
      label: "Open BhashaBuddy",
      url: "https://parampara-one.vercel.app/",
    },
    context:
      "For children growing up abroad, a family language connects everyday words to people, stories, and culture. BhashaBuddy brings practice into an approachable digital environment.",
    problem:
      "The difficult part is sustaining attention and making practice feel inviting. A child needs more than a vocabulary list; the product combines stories, games, conversation, and pronunciation feedback.",
    contribution:
      "My portfolio includes BhashaBuddy as product work across interactive learning and AI-supported language practice. The available source does not specify team size or individual feature ownership, so those details are not inferred.",
    decisions: [
      {
        title: "More than one way to practise.",
        body: "Stories, word games, and conversation offer different paths into language practice. The interface centres activities rather than exposing the underlying model tools.",
      },
      {
        title: "Bring language into the exchange.",
        body: "AI conversation and speech features support practice in the family’s language. The public application exposes Hindi, Tamil, Telugu, and Kannada among its language choices.",
      },
      {
        title: "Connect practice and progress.",
        body: "Supabase supports the application’s data layer, while AI and speech services support the learning activities. The live product also provides a parent-facing view of practice.",
      },
    ],
    challenge:
      "The portfolio describes the main challenge as pedagogical: keeping a young child engaged. This case study does not turn that design intent into an unsupported learning-outcome or retention claim.",
    result:
      "The application is publicly accessible on Vercel. The visual world here uses language characters as artwork; it does not reproduce product UI or manufacture example assessment results.",
    diagram: {
      nodes: [
        "Stories & games",
        "Conversation practice",
        "Speech / Pronunciation",
        "Progress / Parent view",
      ],
      caption:
        "Different learning activities connect to speech practice and a view of progress.",
    },
  },
  {
    slug: "posture-engine",
    title: "Posture Engine",
    descriptor: "& Diet Planner · MyGym",
    category: "COMPUTER VISION",
    number: "05",
    year: "JUN 2025 — JAN 2026",
    hook: "Movement becomes\nuseful feedback.",
    summary:
      "Workout validation through pose estimation, alongside AI-assisted diet planning grounded in Indian food data.",
    role: "Full-stack & AI engineering",
    team: "Solo contribution within MyGym",
    status: "Documented MyGym feature work",
    stack: ["React", "Flask", "MediaPipe", "OpenCV", "MongoDB Atlas", "Figma"],
    context:
      "This work sits inside the wider MyGym product: helping members and trainers understand movement, count repetitions, and work with personalised food plans.",
    problem:
      "A repetition count alone says little about form. Meanwhile, useful diet planning needs to consider goals, allergies, and familiar foods. These are two distinct product needs within the same fitness experience.",
    contribution:
      "I solo-built the posture validation engine, diet planner, and an in-app assistant. The documented work also includes redesigning dashboards, trainer pages, and live-session screens.",
    decisions: [
      {
        title: "Turn landmarks into feedback.",
        body: "MediaPipe and OpenCV provide pose estimation and joint tracking. Joint angles and movement phases support repetition counting and form feedback.",
      },
      {
        title: "Keep diet inputs grounded.",
        body: "The diet engine works with goals, allergies, and an Indian food database. It is presented as a separate planning capability rather than a direct output of the pose model.",
      },
      {
        title: "Make the results usable.",
        body: "React interfaces, Flask services, and MongoDB support the feature work. Dashboard and live-session design connect the underlying capabilities to member and trainer tasks.",
      },
    ],
    challenge:
      "The project combines real-time visual feedback with ordinary product interfaces. This portfolio illustrates joint geometry using scripted poses; it does not request camera access or claim those illustrations are live model detections.",
    result:
      "The work is documented for June 2025–January 2026 as part of MyGym. There is no separate public deployment linked in the original portfolio. No fitness, nutrition, or model-accuracy outcome is asserted.",
    diagram: {
      nodes: [
        "Camera / Frames",
        "MediaPipe / Landmarks",
        "Joint angles / Form",
        "Movement phases / Repetitions",
      ],
      caption:
        "The posture pipeline derives joint and repetition feedback from estimated landmarks. Diet planning is a separate capability using goals, allergies, and food data.",
    },
  },
];
export const getProject = (slug: string) =>
  projects.find((p) => p.slug === slug);
