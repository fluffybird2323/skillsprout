export default {
  settings: {
    title: "設定",
    theme: "テーマ",
    language: "言語",
    install: "アプリをインストール",
    close: "閉じる",
    iosInstall: "このアプリをインストールするには、共有メニューを開いて「ホーム画面に追加」をタップしてください。",
    installInstructions: "このアプリをインストールするには、共有メニューを開いて「ホーム画面に追加」をタップしてください。"
  },
  theme: {
    light: "ライト",
    dark: "ダーク",
    system: "システム"
  },
  auth: {
    signIn: "サインイン",
    signOut: "サインアウト",
    welcomeBack: "おかえりなさい",
    createAccount: "アカウント作成",
    fullName: "氏名",
    fullNamePlaceholder: "山田 太郎",
    chooseAvatar: "アバターを選択",
    emailAddress: "メールアドレス",
    emailPlaceholder: "name@example.jp",
    password: "パスワード",
    dontHaveAccount: "アカウントをお持ちでないですか？",
    signUp: "新規登録",
    alreadyHaveAccount: "既にアカウントをお持ちですか？",
    failed: "認証に失敗しました"
  },
  common: {
    loading: "読み込み中...",
    initializing: "プロトコルを初期化中",
    error: "エラー",
    retry: "再試行",
    cancel: "キャンセル",
    continue: "続行",
    back: "戻る",
    delete: "削除",
    anonymous: "匿名",
    done: "完了",
    tryAgain: "もう一度試す",
    brand: "MANABU"
  },
  error: {
    systemFailure: "システム障害",
    criticalError: "ニューラルマトリックスで致命的なエラーが検出されました。アプリケーションの状態が非同期になっています。",
    rebootSystem: "システムを再起動",
    hardReset: "ハードリセット（データを消去）",
    network: "ネットワークエラーが発生しました。接続を確認してください。",
    timeout: "リクエストがタイムアウトしました。もう一度お試しください。",
    serviceUnavailable: "サービスは一時的に利用できません。もう一度お試しください。",
    gateway: "ゲートウェイエラーが発生しました。サービスに問題が発生しています。",
    gatewayTimeout: "ゲートウェイタイムアウト。リクエストの処理に時間がかかりすぎました。",
    unknown: "不明なエラー",
    parseFailed: "AIレスポンスの解析に失敗しました。ニューラルリンクが破損したデータを返しました。",
    requestTimeout: "リクエストがタイムアウトしました - もう一度お試しください"
  },
  interactive: {
    task: "インタラクティブタスク",
    success: "成功",
    simulation: {
      instruction: "スライダーを調整して正しい値を見つけてください。緑色のゾーンは正しい範囲を示しています。",
      submit: "完璧です！送信",
      check: "答えを確認",
      keepAdjusting: "調整を続けてください...",
      hint: "各スライダーの緑色のゾーンを探してください",
      slider: {
        adjustToward: "{{target}} {{unit}} に向けて調整してみてください",
        target: "目標: {{target}} {{unit}} (±{{tolerance}} {{unit}})",
        range: {
          correct: "正しい範囲",
          close: "目標に近い",
          adjust: "値を調整"
        },
        sr: {
          correct: "正解です！{{label}} が {{value}} {{unit}} に設定されました",
          close: "近づいています。現在の値: {{value}} {{unit}}",
          current: "現在の値: {{value}} {{unit}}。目標は {{target}} {{unit}} です"
        }
      }
    },
    sorting: {
      incorrect: "順番が正しくありません。",
      check: "順番を確認"
    },
    imageEditor: {
      upload: "クリックしてアップロード",
      error: "画像の生成中にエラーが発生しました。"
    },
    defaultInstruction: "インタラクティブな演習を完了してください",
    defaultFeedback: "よくできました！"
  },
  reference: {
    title: "参考資料",
    optionalLabel: "オプション:",
    optionalNotice: "これらの資料は、トピックをより深く理解するためにAIによって厳選されたものです。",
    finding: "最適なリソースを探しています...",
    notFound: "このユニットに関連する参考資料が見つかりませんでした。",
    error: "リファレンスの生成に失敗しました。",
    generate: "リファレンスを生成",
    refresh: "更新",
    resourcesFound: "{{count}} 件のリソースが見つかりました",
    resourcesFound_plural: "{{count}} 件のリソースが見つかりました",
    noReferences: "リファレンスはまだありません",
    generateDescription: "学習を補完するために、厳選された参考資料を生成します。",
    verified: "{{date}} に確認済み",
    types: {
      video: "動画",
      documentation: "ドキュメント",
      tutorial: "チュートリアル",
      interactive: "インタラクティブ",
      article: "記事"
    }
  },
  review: {
    intro: "記憶を定着させる時間です！これらの概念を復習して、連続学習記録を維持しましょう。"
  },
  suggestions: {
    advanced: "高度な概念",
    practical: "実践的な応用",
    mastery: "習得度の復習"
  },
  loader: {
    initializing: "レッスンを読み込み中...",
    searching: "コンテキストを検索中...",
    searchingContext: "現実世界のコンテキストを検索中...",
    generating: "レッスンを作成中...",
    finalizing: "間もなく完了します...",
    complete: "準備完了！",
    failed: "失敗",
    timeout: "タイムアウト",
    failedMessage: "レッスンの読み込みに失敗しました",
    timeoutMessage: "リクエストがタイムアウトしました",
    elapsed: "{{seconds}}秒経過"
  },
  onboarding: {
    newCourse: "新しいコース",
    startLearning: "学習を開始",
    subtitle: "今日は何を学びたいですか？AIがあなたの旅をデザインします。",
    placeholder: "例：量子コンピュータ、React.js...",
    generate: "コースを生成",
    constructing: "構築中...",
    signInToStart: "学習を開始するにはサインインしてください",
    generateNewCourse: "新しいコースを生成",
    casual: "カジュアル",
    serious: "真剣",
    obsessed: "熱中",
    categories: {
      science: "科学",
      arts: "芸術",
      code: "コード"
    },
    error: "おっと！AIに不具合が発生しました。もう一度お試しください。"
  },
  explore: {
    title: "コースを探索",
    discovery: "発見",
    subtitle: "コミュニティが学んでいることをチェックしましょう。",
    searchPlaceholder: "トピックを検索（例：写真、コーディング...）",
    scanning: "マルチバースをスキャン中...",
    units: "ユニット",
    communityChoice: "コミュニティの選択",
    startLearning: "学習を開始",
    noCourses: "コースが見つかりませんでした",
    noCoursesSubtitle: "別のキーワードで検索するか、このコースを最初に生成してみましょう！",
    generateNow: "今すぐ生成",
    backToCourse: "マイコースに戻る"
  },
  lesson: {
    fallback: {
      intro: "{{chapter}} を探索し、主要な概念の理解度をテストしましょう。",
      defaultIntro: "{{topic}} について学びましょう。",
      question1: "{{chapter}} の主要な概念は何ですか？",
      question2: "{{topic}} の基本原則は ___ です。",
      explanation1: "この質問は {{chapter}} の理解度を評価するのに役立ちます。",
      explanation2: "これは基本概念の想起をテストします。"
    },
    error: "レッスンエラー",
    corrupted: "このレッスンは不完全か、破損している可能性があります。",
    tryRecovery: "修復を試みる",
    returnRoadmap: "ロードマップに戻る",
    questionError: "問題のエラー",
    questionLoadError: "現在の問題を読み込めませんでした。ロードマップに戻ってください。",
    questionCorrupted: "現在の問題が破損しているようです。",
    interactiveModule: "インタラクティブモジュール",
    knowledgeDownload: "ナレッジダウンロード",
    startSession: "セッションを開始",
    complete: "完了",
    returnMap: "マップに戻る",
    inputAnswer: "回答を入力",
    trueFalse: "○×問題",
    selectOne: "1つ選択",
    typeHere: "ここに入力...",
    true: "正解",
    false: "不正解",
    checkAnswer: "答えを確認",
    correct: "正解",
    incorrect: "不正解",
    correctAnswer: "正解: ",
    tip: "ヒント:",
    tipDescription: "お困りですか？ユニットの参考資料をチェックして、追加の学習リソースを確認しましょう。"
  },
  roadmap: {
    signOutConfirm: "本当にサインアウトしますか？ローカルの進捗は保存されますが、同期は停止します。",
    shareTitle: "Manabu コース",
    shareText: "{{topic}} に関するこのコースをチェックしてください！",
    linkCopied: "リンクをクリップボードにコピーしました！",
    navigation: "ナビゲーション",
    explore: "探索",
    activeTracks: "学習中のトラック",
    addTrack: "トラックを追加",
    curriculumPath: "カリキュラムパス",
    shareCourse: "コースを共有",
    review: "復習",
    reviewExercise: "復習エクササイズ",
    editMode: "編集モード有効",
    deleteTrack: "トラックを削除",
    deleteTrackTooltip: "学習パスを削除",
    unit: "ユニット",
    referenceMaterials: "参考資料",
    extending: "拡張中...",
    extendPath: "パスを拡張",
    thinking: "思考中...",
    whereNext: "次はどこへ？",
    customTopicPlaceholder: "またはカスタムトピックを入力...",
    deletePathTitle: "パスを削除しますか？",
    deletePathConfirm: "「{{topic}}」の学習パスを削除してもよろしいですか？この操作は取り消せません。",
    checkingCache: "保存されたコンテンツを確認中...",
    loadingCache: "キャッシュから読み込み中...",
    generatingContent: "パーソナライズされたコンテンツを生成中...",
    almostReady: "間もなく完了します...",
    retrying: "再試行中...",
    rateLimit: "レート制限に達しました。数分待ってからもう一度お試しください。",
    networkError: "ネットワークエラーが発生しました。接続を確認してください。",
    failedLoad: "複数回の試行後もレッスンを読み込めませんでした",
    takingLonger: "通常より時間がかかっています...",
    unexpectedError: "予期しないエラーが発生しました。もう一度お試しください。",
    failedGenerateUnit: "ユニットの生成に失敗しました。",
    xp: "XP: {{count}}",
    streak: "🔥 {{count}}",
    hearts: "❤️ {{count}}"
  },
  subjectiveModal: {
    title: "参考資料がありません",
    subtitle: "これは主観的、または自己啓発的なトピックです",
    description: "「{{topic}}」のようなトピックは非常に個人的で主観的なものです。外部のリファレンスの代わりに、インタラクティブなクイズや自己省察エクササイズを通じて、自分に最適な方法を見つけることをお勧めします。",
    whyNoRefs: "なぜリファレンスがないのですか？",
    reason1: "自己啓発の戦略は人によって大きく異なります",
    reason2: "これらのトピックでは、読むことよりも実践することの方が効果的です",
    reason3: "クイズを通じた自己発見は、より深い理解につながります",
    exploreExternal: "それでも外部リソースを調べたいですか？Googleでこのトピックに関する記事や研究を検索できます。",
    continueLearning: "学習を続ける",
    searchGoogle: "Googleで検索"
  },
  pwa: {
    installTitle: "Manabu をインストール",
    iosInstructions: "iPhoneにこのアプリをインストール：{{icon}} をタップして「ホーム画面に追加」を選択します。",
    androidInstructions: "オフラインアクセスや高速な読み込みなど、より良い体験のためにアプリをインストールしてください。",
    install: "インストール",
    notNow: "後で"
  }
};
