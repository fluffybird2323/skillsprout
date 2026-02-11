export default {
  settings: {
    title: "Configurações",
    theme: "Tema",
    language: "Idioma",
    install: "Instalar App",
    close: "Fechar",
    iosInstall: "Para instalar este aplicativo, abra o menu Compartilhar e toque em \"Adicionar à Tela de Início\".",
    installInstructions: "Para instalar este aplicativo, abra o menu Compartilhar e toque em \"Adicionar à Tela de Início\"."
  },
  theme: {
    light: "Claro",
    dark: "Escuro",
    system: "Sistema"
  },
  auth: {
    signIn: "Entrar",
    signOut: "Sair",
    welcomeBack: "Bem-vindo de volta",
    createAccount: "Criar Conta",
    fullName: "Nome Completo",
    fullNamePlaceholder: "João Silva",
    chooseAvatar: "Escolha seu Avatar",
    emailAddress: "Endereço de E-mail",
    emailPlaceholder: "nome@exemplo.com",
    password: "Senha",
    dontHaveAccount: "Não tem uma conta?",
    signUp: "Cadastre-se",
    alreadyHaveAccount: "Já tem uma conta?",
    failed: "Falha na autenticação"
  },
  common: {
    loading: "Carregando...",
    initializing: "Inicializando Protocolo",
    error: "Erro",
    retry: "Repetir",
    cancel: "Cancelar",
    continue: "Continuar",
    back: "Voltar",
    delete: "Excluir",
    anonymous: "Anônimo",
    done: "Concluído",
    tryAgain: "Tentar Novamente",
    brand: "MANABU"
  },
  error: {
    systemFailure: "Falha no Sistema",
    criticalError: "Erro crítico detectado na matriz neural. O estado da aplicação está dessincronizado.",
    rebootSystem: "Reiniciar Sistema",
    hardReset: "Reset Forçado (Limpar Dados)",
    network: "Erro de rede. Por favor, verifique sua conexão.",
    timeout: "O tempo da requisição expirou. Por favor, tente novamente.",
    serviceUnavailable: "Serviço temporariamente indisponível. Por favor, tente novamente.",
    gateway: "Erro de gateway. O serviço está passando por problemas.",
    gatewayTimeout: "Tempo limite do gateway. A solicitação demorou muito para ser processada.",
    unknown: "Erro desconhecido",
    parseFailed: "Falha ao analisar a resposta da IA. O link neural retornou dados corrompidos.",
    requestTimeout: "Tempo limite da solicitação - tente novamente"
  },
  interactive: {
    task: "Tarefa Interativa",
    success: "Sucesso",
    simulation: {
      instruction: "Ajuste os controles deslizantes para encontrar os valores corretos. As zonas verdes indicam faixas corretas.",
      submit: "Perfeito! Enviar",
      check: "Verificar Resposta",
      keepAdjusting: "Continue ajustando...",
      hint: "Procure as zonas verdes em cada controle deslizante",
      slider: {
        adjustToward: "Tente ajustar para {{target}} {{unit}}",
        target: "Alvo: {{target}} {{unit}} (±{{tolerance}} {{unit}})",
        range: {
          correct: "Faixa correta",
          close: "Perto do alvo",
          adjust: "Ajustar valor"
        },
        sr: {
          correct: "Correto! {{label}} está definido para {{value}} {{unit}}",
          close: "Chegando perto. Valor atual: {{value}} {{unit}}",
          current: "Valor atual: {{value}} {{unit}}. O alvo é {{target}} {{unit}}"
        }
      }
    },
    sorting: {
      incorrect: "Sequência incorreta.",
      check: "Verificar Ordem"
    },
    imageEditor: {
      upload: "Clique para Upload",
      error: "Erro ao gerar imagem."
    },
    defaultInstruction: "Complete o exercício interativo",
    defaultFeedback: "Bom trabalho!"
  },
  reference: {
    title: "Materiais de Referência",
    optionalLabel: "Opcional:",
    optionalNotice: "Estes materiais são curados por IA para ajudar você a se aprofundar no tópico.",
    finding: "Encontrando os melhores recursos para você...",
    notFound: "Não foi possível encontrar materiais de referência relevantes para esta unidade.",
    error: "Falha ao gerar referências.",
    generate: "Gerar Referências",
    refresh: "Atualizar",
    resourcesFound: "{{count}} recurso encontrado",
    resourcesFound_plural: "{{count}} recursos encontrados",
    noReferences: "Ainda Sem Referências",
    generateDescription: "Gere materiais de referência curados para suplementar seu aprendizado nesta unidade.",
    verified: "Verificado em {{date}}",
    types: {
      video: "Vídeo",
      documentation: "Documentação",
      tutorial: "Tutorial",
      interactive: "Interativo",
      article: "Artigo"
    }
  },
  review: {
    intro: "É hora de fortalecer sua memória! Revise estes conceitos para manter sua ofensiva ativa."
  },
  suggestions: {
    advanced: "Conceitos Avançados",
    practical: "Aplicação Prática",
    mastery: "Revisão de Domínio"
  },
  loader: {
    initializing: "Carregando lição...",
    searching: "Buscando contexto...",
    searchingContext: "Buscando contexto do mundo real...",
    generating: "Criando lição...",
    finalizing: "Quase pronto...",
    complete: "Pronto!",
    failed: "Falhou",
    timeout: "Tempo esgotado",
    failedMessage: "Falha ao carregar lição",
    timeoutMessage: "Tempo da requisição esgotado",
    elapsed: "{{seconds}}s decorridos"
  },
  onboarding: {
    newCourse: "Novo Curso",
    startLearning: "Começar a Aprender",
    subtitle: "O que você quer aprender hoje? A IA desenhará sua jornada.",
    placeholder: "ex: Computação Quântica, React.js...",
    generate: "Gerar Curso",
    constructing: "Construindo...",
    signInToStart: "Entre para Começar a Aprender",
    generateNewCourse: "Gerar Novo Curso",
    casual: "Casual",
    serious: "Sério",
    obsessed: "Obsessivo",
    categories: {
      science: "Ciência",
      arts: "Artes",
      code: "Código"
    },
    error: "Ops! A IA teve um soluço. Tente novamente."
  },
  explore: {
    title: "Explorar Cursos",
    discovery: "Descoberta",
    subtitle: "Aprenda o que a comunidade está aprendiendo.",
    searchPlaceholder: "Buscar tópicos (ex: Fotografia, Programação...)",
    scanning: "Escaneando o multiverso...",
    units: "Unidades",
    communityChoice: "Escolha da Comunidade",
    startLearning: "Começar a Aprender",
    noCourses: "Nenhum curso encontrado",
    noCoursesSubtitle: "Tente uma busca diferente ou seja o primeiro a gerar este curso!",
    generateNow: "Gerar Agora",
    backToCourse: "Voltar ao Meu Curso"
  },
  lesson: {
    fallback: {
      intro: "Vamos explorar {{chapter}} e testar sua compreensão dos conceitos-chave.",
      defaultIntro: "Vamos aprender sobre {{topic}}.",
      question1: "Qual é o conceito principal de {{chapter}}?",
      question2: "O princípio-chave de {{topic}} é ___.",
      explanation1: "Esta pergunta ajuda a avaliar a compreensão de {{chapter}}.",
      explanation2: "Isso testa a recordação de conceitos fundamentais."
    },
    error: "Erro na Lição",
    corrupted: "Esta lição parece estar incompleta ou corrompida.",
    tryRecovery: "Tentar Recuperação",
    returnRoadmap: "Voltar para o Roadmap",
    questionError: "Erro na Pergunta",
    questionLoadError: "A pergunta atual não pôde ser carregada. Por favor, volte para o roadmap.",
    questionCorrupted: "A pergunta atual parece estar corrompida.",
    interactiveModule: "Módulo Interativo",
    knowledgeDownload: "Download de Conhecimento",
    startSession: "Iniciar Sessão",
    complete: "CONCLUÍDO",
    returnMap: "Voltar para o Mapa",
    inputAnswer: "Inserir Resposta",
    trueFalse: "Verdadeiro ou Falso",
    selectOne: "Selecione Um",
    typeHere: "Digite aqui...",
    true: "Verdadeiro",
    false: "Falso",
    checkAnswer: "Verificar Resposta",
    correct: "Correto",
    incorrect: "Incorreto",
    correctAnswer: "Resposta Correta: ",
    tip: "Dica:",
    tipDescription: "Está com dificuldades? Verifique os materiais de referência da unidade para recursos de aprendizado adicionais."
  },
  roadmap: {
    signOutConfirm: "Tem certeza que deseja sair? Seu progresso local será salvo, mas a sincronização irá parar.",
    shareTitle: "Curso Manabu",
    shareText: "Confira este curso sobre {{topic}}!",
    linkCopied: "Link copiado para a área de transferência!",
    navigation: "Navegação",
    explore: "Explorar",
    activeTracks: "Trilhas Ativas",
    addTrack: "Adicionar Trilha",
    curriculumPath: "Caminho Curricular",
    shareCourse: "Compartilhar Curso",
    review: "Revisar",
    reviewExercise: "Exercício de Revisão",
    editMode: "Modo de Edição Ativo",
    deleteTrack: "Excluir Trilha",
    deleteTrackTooltip: "Excluir Caminho de Aprendizado",
    unit: "Unidade",
    referenceMaterials: "Materiais de Referência",
    extending: "Estendendo...",
    extendPath: "Estender Caminho",
    thinking: "Pensando...",
    whereNext: "Para onde agora?",
    customTopicPlaceholder: "Ou digite um tópico personalizado...",
    deletePathTitle: "Excluir Caminho?",
    deletePathConfirm: "Tem certeza que deseja excluir o caminho de aprendizado \"{{topic}}\"? Esta ação não pode ser desfeita.",
    checkingCache: "Verificando conteúdo salvo...",
    loadingCache: "Carregando do cache...",
    generatingContent: "Gerando conteúdo personalizado...",
    almostReady: "Quase pronto...",
    retrying: "Repetindo...",
    rateLimit: "Limite de taxa atingido. Por favor, aguarde alguns minutos antes de tentar novamente.",
    networkError: "Erro de rede. Por favor, verifique sua conexão.",
    failedLoad: "Falha ao carregar lição após várias tentativas",
    takingLonger: "Demorando mais que o normal...",
    unexpectedError: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    failedGenerateUnit: "Falha ao gerar unidade.",
    xp: "XP: {{count}}",
    streak: "🔥 {{count}}",
    hearts: "❤️ {{count}}"
  },
  subjectiveModal: {
    title: "Nenhuma Referência Disponível",
    subtitle: "Este é um tópico de desenvolvimento subjetivo ou pessoal",
    description: "Tópicos como \"{{topic}}\" são altamente pessoais e subjetivos. Em vez de referências externas, recomendamos aprender através de quizzes interativos e exercícios de autorreflexão que ajudam você a descobrir o que funciona melhor para você.",
    whyNoRefs: "Por que não há referências?",
    reason1: "Estratégias de desenvolvimento pessoal variam muito de pessoa para pessoa",
    reason2: "Prática prática é mais eficaz do que a leitura para estes tópicos",
    reason3: "A autodescoberta através de quizzes leva a uma melhor compreensão",
    exploreExternal: "Ainda quer explorar recursos externos? Você pode pesquisar no Google por artigos e pesquisas sobre este tópico.",
    continueLearning: "Continuar Aprendendo",
    searchGoogle: "Pesquisar no Google"
  },
  pwa: {
    installTitle: "Instalar Manabu",
    iosInstructions: "Instale este aplicativo no seu iPhone: toque em {{icon}} e depois em Adicionar à Tela de Início.",
    androidInstructions: "Instale o aplicativo para uma melhor experiência com acesso offline e carregamento mais rápido.",
    install: "Instalar",
    notNow: "Agora não"
  }
};
