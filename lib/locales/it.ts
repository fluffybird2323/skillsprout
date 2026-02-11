export default {
  settings: {
    title: "Impostazioni",
    theme: "Tema",
    language: "Lingua",
    install: "Installa App",
    close: "Chiudi",
    iosInstall: "Per installare questa app, apri il menu Condividi e tocca \"Aggiungi alla schermata iniziale\".",
    installInstructions: "Per installare questa app, apri il menu Condividi e tocca \"Aggiungi alla schermata iniziale\"."
  },
  theme: {
    light: "Chiaro",
    dark: "Scuro",
    system: "Sistema"
  },
  auth: {
    signIn: "Accedi",
    signOut: "Esci",
    welcomeBack: "Bentornato",
    createAccount: "Crea Account",
    fullName: "Nome Completo",
    fullNamePlaceholder: "Mario Rossi",
    chooseAvatar: "Scegli il tuo Avatar",
    emailAddress: "Indirizzo Email",
    emailPlaceholder: "nome@esempio.it",
    password: "Password",
    dontHaveAccount: "Non hai un account?",
    signUp: "Registrati",
    alreadyHaveAccount: "Hai già un account?",
    failed: "Autenticazione fallita"
  },
  common: {
    loading: "Caricamento...",
    initializing: "Inizializzazione Protocollo",
    error: "Errore",
    retry: "Riprova",
    cancel: "Annulla",
    continue: "Continua",
    back: "Indietro",
    delete: "Elimina",
    anonymous: "Anonimo",
    done: "Fatto",
    tryAgain: "Riprova ancora",
    brand: "MANABU"
  },
  error: {
    systemFailure: "Guasto del Sistema",
    criticalError: "Errore critico rilevato nella matrice neurale. Lo stato dell'applicazione è desincronizzato.",
    rebootSystem: "Riavvia Sistema",
    hardReset: "Reset Completo (Cancella Dati)",
    network: "Errore di rete. Per favore controlla la tua connessione.",
    timeout: "Richiesta scaduta. Per favore riprova.",
    serviceUnavailable: "Servizio temporaneamente non disponibile. Per favore riprova.",
    gateway: "Errore gateway. Il servizio sta riscontrando problemi.",
    gatewayTimeout: "Timeout del gateway. La richiesta ha impiegato troppo tempo per essere elaborata.",
    unknown: "Errore sconosciuto",
    parseFailed: "Impossibile analizzare la risposta dell'IA. Il collegamento neurale ha restituito dati corrotti.",
    requestTimeout: "Richiesta scaduta - riprova"
  },
  interactive: {
    task: "Attività interattiva",
    success: "Successo",
    simulation: {
      instruction: "Regola i cursori per trovare i valori corretti. Le zone verdi indicano gli intervalli corretti.",
      submit: "Perfetto! Invia",
      check: "Controlla risposta",
      keepAdjusting: "Continua a regolare...",
      hint: "Cerca le zone verdi su ogni cursore",
      slider: {
        adjustToward: "Prova a regolare verso {{target}} {{unit}}",
        target: "Obiettivo: {{target}} {{unit}} (±{{tolerance}} {{unit}})",
        range: {
          correct: "Intervallo corretto",
          close: "Vicino all'obiettivo",
          adjust: "Regola valore"
        },
        sr: {
          correct: "Corretto! {{label}} è impostato su {{value}} {{unit}}",
          close: "Ci sei quasi. Valore attuale: {{value}} {{unit}}",
          current: "Valore attuale: {{value}} {{unit}}. L'obiettivo è {{target}} {{unit}}"
        }
      }
    },
    sorting: {
      incorrect: "Sequenza errata.",
      check: "Controlla ordine"
    },
    imageEditor: {
      upload: "Fai clic per caricare",
      error: "Errore durante la generazione dell'immagine."
    },
    defaultInstruction: "Completa l'esercizio interattivo",
    defaultFeedback: "Ottimo lavoro!"
  },
  reference: {
    title: "Materiali di Riferimento",
    optionalLabel: "Opzionale:",
    optionalNotice: "Questi materiali sono curati dall'IA per aiutarti ad approfondire l'argomento.",
    finding: "Ricerca delle migliori risorse per te...",
    notFound: "Impossibile trovare materiali di riferimento pertinenti per questa unità.",
    error: "Impossibile generare i riferimenti.",
    generate: "Genera Riferimenti",
    refresh: "Aggiorna",
    resourcesFound: "{{count}} risorsa trovata",
    resourcesFound_plural: "{{count}} risorse trovate",
    noReferences: "Ancora nessuna referenza",
    generateDescription: "Genera materiali di riferimento curati per integrare il tuo apprendimento per questa unità.",
    verified: "Verificato il {{date}}",
    types: {
      video: "Video",
      documentation: "Documentazione",
      tutorial: "Tutorial",
      interactive: "Interattivo",
      article: "Articolo"
    }
  },
  review: {
    intro: "È ora di rafforzare la tua memoria! Ripassa questi concetti per mantenere attiva la tua serie."
  },
  suggestions: {
    advanced: "Concetti Avanzati",
    practical: "Applicazione Pratica",
    mastery: "Ripasso di Padronanza"
  },
  loader: {
    initializing: "Caricamento lezione...",
    searching: "Ricerca contesto...",
    searchingContext: "Ricerca contesto reale...",
    generating: "Creazione lezione...",
    finalizing: "Quasi pronto...",
    complete: "Pronto!",
    failed: "Fallito",
    timeout: "Timeout",
    failedMessage: "Impossibile caricare la lezione",
    timeoutMessage: "Richiesta scaduta",
    elapsed: "{{seconds}}s trascorsi"
  },
  onboarding: {
    newCourse: "Nuovo Corso",
    startLearning: "Inizia ad Imparare",
    subtitle: "Cosa vuoi imparare oggi? L'IA progetterà il tuo viaggio.",
    placeholder: "es. Informatica Quantistica, React.js...",
    generate: "Genera Corso",
    constructing: "Costruzione in corso...",
    signInToStart: "Accedi per Iniziare ad Imparare",
    generateNewCourse: "Genera Nuovo Corso",
    casual: "Casuale",
    serious: "Serio",
    obsessed: "Ossessionato",
    categories: {
      science: "Scienza",
      arts: "Arte",
      code: "Codice"
    },
    error: "Ops! L'IA ha avuto un singhiozzo. Riprova."
  },
  explore: {
    title: "Esplora Corsi",
    discovery: "Scoperta",
    subtitle: "Scopri cosa sta imparando la community.",
    searchPlaceholder: "Cerca argomenti (es. Fotografia, Programmazione...)",
    scanning: "Scansione del multiverso...",
    units: "Unità",
    communityChoice: "Scelta della Community",
    startLearning: "Inizia ad Imparare",
    noCourses: "Nessun corso trovato",
    noCoursesSubtitle: "Prova una ricerca diversa o sii il primo a generare questo corso!",
    generateNow: "Genera Ora",
    backToCourse: "Torna al Mio Corso"
  },
  lesson: {
    fallback: {
      intro: "Esploriamo {{chapter}} e testiamo la tua comprensione dei concetti chiave.",
      defaultIntro: "Impariamo qualcosa su {{topic}}.",
      question1: "Qual è il concetto principale di {{chapter}}?",
      question2: "Il principio chiave di {{topic}} è ___.",
      explanation1: "Questa domanda aiuta a valutare la comprensione di {{chapter}}.",
      explanation2: "Questo testa il richiamo dei concetti fondamentali."
    },
    error: "Errore Lezione",
    corrupted: "Questa lezione sembra incompleta o corrotta.",
    tryRecovery: "Prova Recupero",
    returnRoadmap: "Torna alla Roadmap",
    questionError: "Errore Domanda",
    questionLoadError: "La domanda corrente non può essere caricata. Per favore torna alla roadmap.",
    questionCorrupted: "La domanda corrente sembra essere corrotta.",
    interactiveModule: "Modulo Interattivo",
    knowledgeDownload: "Download Conoscenza",
    startSession: "Inizia Sessione",
    complete: "COMPLETATO",
    returnMap: "Torna alla Mappa",
    inputAnswer: "Inserisci Risposta",
    trueFalse: "Vero o Falso",
    selectOne: "Seleziona Uno",
    typeHere: "Scrivi qui...",
    true: "Vero",
    false: "Falso",
    checkAnswer: "Controlla Risposta",
    correct: "Corretto",
    incorrect: "Errato",
    correctAnswer: "Risposta Corretta: ",
    tip: "Suggerimento:",
    tipDescription: "Hai difficoltà? Controlla i materiali di riferimento dell'unità per ulteriori risorse di apprendimento."
  },
  roadmap: {
    signOutConfirm: "Sei sicuro di voler uscire? I tuoi progressi locali saranno salvati ma la sincronizzazione si interromperà.",
    shareTitle: "Corso Manabu",
    shareText: "Guarda questo corso su {{topic}}!",
    linkCopied: "Link copiato negli appunti!",
    navigation: "Navigazione",
    explore: "Esplora",
    activeTracks: "Percorsi Attivi",
    addTrack: "Aggiungi Percorso",
    curriculumPath: "Percorso Formativo",
    shareCourse: "Condividi Corso",
    review: "Ripassa",
    reviewExercise: "Esercizio di Ripasso",
    editMode: "Modalità Modifica Attiva",
    deleteTrack: "Elimina Percorso",
    deleteTrackTooltip: "Elimina Percorso di Apprendimento",
    unit: "Unità",
    referenceMaterials: "Materiali di Riferimento",
    extending: "Estensione in corso...",
    extendPath: "Estendi Percorso",
    thinking: "Riflessione...",
    whereNext: "Dove si va ora?",
    customTopicPlaceholder: "O scrivi un argomento personalizzato...",
    deletePathTitle: "Elimina Percorso?",
    deletePathConfirm: "Sei sicuro di voler eliminare il percorso di apprendimento \"{{topic}}\"? Questa azione non può essere annullata.",
    checkingCache: "Controllo contenuti salvati...",
    loadingCache: "Caricamento dalla cache...",
    generatingContent: "Generazione contenuti personalizzati...",
    almostReady: "Quasi pronto...",
    retrying: "Riprovo...",
    rateLimit: "Limite di velocità raggiunto. Per favore attendi qualche minuto prima di riprovare.",
    networkError: "Errore di rete. Per favore controlla la tua connessione.",
    failedLoad: "Impossibile caricare la lezione dopo diversi tentativi",
    takingLonger: "Ci sta mettendo più del solito...",
    unexpectedError: "Si è verificato un errore imprevisto. Per favore riprova.",
    failedGenerateUnit: "Generazione unità fallita.",
    xp: "XP: {{count}}",
    streak: "🔥 {{count}}",
    hearts: "❤️ {{count}}"
  },
  subjectiveModal: {
    title: "Nessun Riferimento Disponibile",
    subtitle: "Questo è un argomento di sviluppo soggettivo o personale",
    description: "Argomenti come \"{{topic}}\" sono altamente personali e soggettivi. Invece di riferimenti esterni, consigliamo di imparare attraverso quiz interattivi ed esercizi di auto-riflessione che ti aiutano a scoprire cosa funziona meglio per te.",
    whyNoRefs: "Perché non ci sono riferimenti?",
    reason1: "Le strategie di sviluppo personale variano notevolmente da persona a persona",
    reason2: "La pratica sul campo è più efficace della lettura per questi argomenti",
    reason3: "L'auto-scoperta attraverso i quiz porta a una migliore comprensione",
    exploreExternal: "Vuoi comunque esplorare risorse esterne? Puoi cercare su Google articoli e ricerche su questo argomento.",
    continueLearning: "Continua ad Imparare",
    searchGoogle: "Cerca su Google"
  },
  pwa: {
    installTitle: "Installa Manabu",
    iosInstructions: "Installa questa app sul tuo iPhone: tocca {{icon}} e poi Aggiungi alla schermata iniziale.",
    androidInstructions: "Installa l'app per un'esperienza migliore con accesso offline e caricamento più rapido.",
    install: "Installa",
    notNow: "Non ora"
  }
};
