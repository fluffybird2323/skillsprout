export default {
  settings: {
    title: "Settings",
    theme: "Theme",
    language: "Language",
    install: "Install App",
    close: "Close",
    iosInstall: "To install this app, open the Share menu and tap \"Add to Home Screen\".",
    installInstructions: "To install this app, open the Share menu and tap \"Add to Home Screen\"."
  },
  theme: {
    light: "Light",
    dark: "Dark",
    system: "System"
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    fullName: "Full Name",
    fullNamePlaceholder: "John Doe",
    chooseAvatar: "Choose Your Avatar",
    emailAddress: "Email Address",
    emailPlaceholder: "name@example.com",
    password: "Password",
    dontHaveAccount: "Don't have an account?",
    signUp: "Sign up",
    alreadyHaveAccount: "Already have an account?",
    failed: "Authentication failed"
  },
  common: {
    loading: "Loading...",
    initializing: "Initializing Protocol",
    error: "Error",
    retry: "Retry",
    cancel: "Cancel",
    continue: "Continue",
    back: "Back",
    delete: "Delete",
    anonymous: "Anonymous",
    done: "Done",
    tryAgain: "Try Again",
    brand: "MANABU"
  },
  error: {
    systemFailure: "System Failure",
    criticalError: "Critical error detected in the neural matrix. The application state has desynchronized.",
    rebootSystem: "Reboot System",
    hardReset: "Hard Reset (Clear Data)",
    network: "Network error. Please check your connection.",
    timeout: "Request timed out. Please try again.",
    serviceUnavailable: "Service temporarily unavailable. Please try again.",
    gateway: "Gateway error. The service is experiencing issues.",
    gatewayTimeout: "Gateway timeout. The request took too long to process.",
    unknown: "Unknown error",
    parseFailed: "Failed to parse AI response. The neural link returned corrupted data.",
    requestTimeout: "Request timeout - please try again"
  },
  interactive: {
    task: "Interactive Task",
    success: "Success",
    simulation: {
      instruction: "Adjust the sliders to find the correct values. Green zones indicate correct ranges.",
      submit: "Perfect! Submit",
      check: "Check Answer",
      keepAdjusting: "Keep adjusting...",
      hint: "Look for the green zones on each slider",
      slider: {
        adjustToward: "Try adjusting toward {{target}} {{unit}}",
        target: "Target: {{target}} {{unit}} (±{{tolerance}} {{unit}})",
        range: {
          correct: "Correct range",
          close: "Close to target",
          adjust: "Adjust value"
        },
        sr: {
          correct: "Correct! {{label}} is set to {{value}} {{unit}}",
          close: "Getting close. Current value: {{value}} {{unit}}",
          current: "Current value: {{value}} {{unit}}. Target is {{target}} {{unit}}"
        }
      }
    },
    sorting: {
      incorrect: "Incorrect sequence.",
      check: "Check Order"
    },
    imageEditor: {
      upload: "Click to Upload",
      error: "Error generating image."
    },
    defaultInstruction: "Complete the interactive exercise",
    defaultFeedback: "Great job!"
  },
  reference: {
    title: "Reference Materials",
    optionalLabel: "Optional:",
    optionalNotice: "These materials are curated by AI to help you dive deeper into the topic.",
    finding: "Finding the best resources for you...",
    notFound: "Could not find relevant reference materials for this unit.",
    error: "Failed to generate references.",
    generate: "Generate References",
    refresh: "Refresh",
    resourcesFound: "{{count}} resource found",
    resourcesFound_plural: "{{count}} resources found",
    noReferences: "No References Yet",
    generateDescription: "Generate curated reference materials to supplement your learning for this unit.",
    verified: "Verified {{date}}",
    types: {
      video: "Video",
      documentation: "Docs",
      tutorial: "Tutorial",
      interactive: "Interactive",
      article: "Article"
    }
  },
  review: {
    intro: "It's time to strengthen your memory! Review these concepts to keep your streak alive."
  },
  suggestions: {
    advanced: "Advanced Concepts",
    practical: "Practical Application",
    mastery: "Mastery Review"
  },
  loader: {
    initializing: "Loading lesson...",
    searching: "Searching for context...",
    searchingContext: "Searching for real-world context...",
    generating: "Creating lesson...",
    finalizing: "Almost ready...",
    complete: "Ready!",
    failed: "Failed",
    timeout: "Timeout",
    failedMessage: "Failed to load lesson",
    timeoutMessage: "Request timed out",
    elapsed: "{{seconds}}s elapsed"
  },
  onboarding: {
    newCourse: "New Course",
    startLearning: "Start Learning",
    subtitle: "What do you want to learn today? AI will design your journey.",
    placeholder: "e.g. Quantum Computing, React.js...",
    generate: "Generate Course",
    constructing: "Constructing...",
    signInToStart: "Sign In to Start Learning",
    generateNewCourse: "Generate New Course",
    casual: "Casual",
    serious: "Serious",
    obsessed: "Obsessed",
    categories: {
      science: "Science",
      arts: "Arts",
      code: "Code"
    },
    error: "Oops! AI had a hiccup. Try again."
  },
  explore: {
    title: "Explore Courses",
    discovery: "Discovery",
    subtitle: "Learn what the community is learning.",
    searchPlaceholder: "Search topics (e.g. Photography, Coding...)",
    scanning: "Scanning the multiverse...",
    units: "Units",
    communityChoice: "Community Choice",
    startLearning: "Start Learning",
    noCourses: "No courses found",
    noCoursesSubtitle: "Try a different search or be the first to generate this course!",
    generateNow: "Generate Now",
    backToCourse: "Back to My Course"
  },
  lesson: {
    fallback: {
      intro: "Let's explore {{chapter}} and test your understanding of key concepts.",
      defaultIntro: "Let's learn about {{topic}}.",
      question1: "What is the main concept of {{chapter}}?",
      question2: "The key principle of {{topic}} is ___.",
      explanation1: "This question helps assess understanding of {{chapter}}.",
      explanation2: "This tests recall of fundamental concepts."
    },
    error: "Lesson Error",
    corrupted: "This lesson appears to be incomplete or corrupted.",
    tryRecovery: "Try Recovery",
    returnRoadmap: "Return to Roadmap",
    questionError: "Question Error",
    questionLoadError: "The current question could not be loaded. Please return to the roadmap.",
    questionCorrupted: "The current question appears to be corrupted.",
    interactiveModule: "Interactive Module",
    knowledgeDownload: "Knowledge Download",
    startSession: "Start Session",
    complete: "COMPLETE",
    returnMap: "Return to Map",
    inputAnswer: "Input Answer",
    trueFalse: "True or False",
    selectOne: "Select One",
    typeHere: "Type here...",
    true: "True",
    false: "False",
    checkAnswer: "Check Answer",
    correct: "Correct",
    incorrect: "Incorrect",
    correctAnswer: "Correct Answer: ",
    tip: "Tip:",
    tipDescription: "Having trouble? Check the unit's reference materials for additional learning resources."
  },
  roadmap: {
    signOutConfirm: "Are you sure you want to sign out? Your local progress will be saved but sync will stop.",
    shareTitle: "Manabu Course",
    shareText: "Check out this course on {{topic}}!",
    linkCopied: "Link copied to clipboard!",
    navigation: "Navigation",
    explore: "Explore",
    activeTracks: "Active Tracks",
    addTrack: "Add Track",
    curriculumPath: "Curriculum Path",
    shareCourse: "Share Course",
    review: "Review",
    reviewExercise: "Review Exercise",
    editMode: "Edit Mode Active",
    deleteTrack: "Delete Track",
    deleteTrackTooltip: "Delete Learning Path",
    unit: "Unit",
    referenceMaterials: "Reference Materials",
    extending: "Extending...",
    extendPath: "Extend Path",
    thinking: "Thinking...",
    whereNext: "Where to next?",
    customTopicPlaceholder: "Or type custom topic...",
    deletePathTitle: "Delete Path?",
    deletePathConfirm: "Are you sure you want to delete the \"{{topic}}\" learning path? This action cannot be undone.",
    checkingCache: "Checking for saved content...",
    loadingCache: "Loading from cache...",
    generatingContent: "Generating personalized content...",
    almostReady: "Almost ready...",
    retrying: "Retrying...",
    rateLimit: "Rate limit reached. Please wait a few minutes before trying again.",
    networkError: "Network error. Please check your connection.",
    failedLoad: "Failed to load lesson after multiple attempts",
    takingLonger: "Taking longer than usual...",
    unexpectedError: "An unexpected error occurred. Please try again.",
    failedGenerateUnit: "Failed to generate unit.",
    xp: "XP: {{count}}",
    streak: "🔥 {{count}}",
    hearts: "❤️ {{count}}"
  },
  subjectiveModal: {
    title: "No References Available",
    subtitle: "This is a subjective or personal development topic",
    description: "Topics like \"{{topic}}\" are highly personal and subjective. Instead of external references, we recommend learning through interactive quizzes and self-reflection exercises that help you discover what works best for you.",
    whyNoRefs: "Why no references?",
    reason1: "Personal development strategies vary greatly from person to person",
    reason2: "Hands-on practice is more effective than reading for these topics",
    reason3: "Self-discovery through quizzes leads to better understanding",
    exploreExternal: "Still want to explore external resources? You can search Google for articles and research on this topic.",
    continueLearning: "Continue Learning",
    searchGoogle: "Search Google"
  },
  pwa: {
    installTitle: "Install Manabu",
    iosInstructions: "Install this app on your iPhone: tap {{icon}} and then Add to Home Screen.",
    androidInstructions: "Install the app for a better experience with offline access and faster loading.",
    install: "Install",
    notNow: "Not now"
  }
};
