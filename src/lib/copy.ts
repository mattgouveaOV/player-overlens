/**
 * Microcopy centralizada do Player.
 * Toda string visível ao mentorado vive aqui — facilita i18n futuro
 * e garante coerência com o Universo Verbal Overlens.
 *
 * Regras:
 * - Registro funcional: botões, labels, estados — direto e preciso
 * - Registro aspiracional: marcos, reflexão — peso emocional controlado
 * - Nunca: guru, hack, disruptivo, fórmula, mindset, urgência artificial
 * - Sempre: atravessar, encontro, sala, lente, jornada
 */

export const copy = {
  lobby: {
    title: (sessionTitle: string) => sessionTitle,
    live: 'Ao vivo',
    scheduled: (minutesLeft: number) =>
      minutesLeft > 60
        ? `Em breve. O encontro abre em ${Math.ceil(minutesLeft / 60)}h`
        : `Em breve. O encontro abre em ${minutesLeft} minutos`,
    ended: 'Este encontro foi encerrado',
    chooseSala: 'Escolha por onde atravessar',
    endsIn: (minutes: number) => `Encerra em ${minutes} minutos`,
  },

  sala: {
    open: (count: number, max: number) => `${count} de ${max} · aberta`,
    full: (max: number) => `${max} de ${max} · cheia`,
    empty: 'Ninguém ainda · aberta',
    enter: 'Entrar',
    fullCta: 'Sala cheia',
    firstArrival: 'Você chegou primeiro. A sala está pronta.',
  },

  previewGate: {
    camOffDefault: 'Você pode ligar sua câmera quando sentir que é hora',
    noRecording: 'Este encontro não é gravado',
    enter: 'Entrar na sala',
    back: 'Voltar',
    enterNoCamera: 'Entrar sem câmera',
  },

  inCall: {
    atravessando: 'Atravessando…',
    lobby: '← Mapa',
    leave: 'Sair',
    mute: 'Silenciar',
    unmute: 'Ativar microfone',
    camOff: 'Desligar câmera',
    camOn: 'Ligar câmera',
    shareScreen: 'Compartilhar tela',
    stopShare: 'Parar compartilhamento',
    chat: 'Chat',
    report: 'Reportar',
    reconnecting: 'A conexão caiu. Tentando de novo…',
    ending5min: 'O encontro se encerra em 5 minutos',
    endingGrace: 'O encontro se encerra. Você pode permanecer por mais 5 minutos se precisar.',
    rail: {
      otherSalas: 'Atravessar para',
      full: 'Cheia',
    },
    chatInput: {
      placeholder: 'Mensagem para a sala…',
      send: 'Enviar',
    },
  },

  encerrado: {
    title: 'O encontro se encerrou.',
    reflection: 'Que atravessamento ficou com você?',
    reflectionPlaceholder: 'Uma frase, opcional…',
    save: 'Guardar',
    skip: 'Pular',
    backToAreaSecreta: 'Voltar para a área secreta',
  },

  admin: {
    sessions: 'Encontros',
    newSession: 'Novo encontro',
    publish: 'Publicar',
    saveDraft: 'Salvar rascunho',
    addRoom: 'Adicionar sala',
    removeRoom: 'Remover',
    dryRun: 'Testar fluxo',
    monitor: 'Monitor ao vivo',
    openNow: 'Abrir agora',
    endSession: 'Encerrar encontro',
    fields: {
      title: 'Título do encontro',
      scheduledAt: 'Data e hora de início',
      durationMinutes: 'Duração (minutos)',
      roomName: 'Nome da sala',
      roomDescription: 'Descrição curta',
      anchorPrompt: 'Prompt-âncora (obrigatório)',
      anchorPromptHint: 'Uma frase que abre a conversa. Ex: "Conversamos aqui sobre o que muda quando o ciclo pede outro gesto."',
      maxMembers: 'Capacidade máxima',
      coverUrl: 'URL da imagem de capa (opcional)',
    },
    validation: {
      minOneRoom: 'Adicione pelo menos uma sala antes de publicar',
      anchorRequired: 'O prompt-âncora é obrigatório em modo Player',
      futureDate: 'A data deve ser no futuro',
    },
  },

  errors: {
    notAuthenticated: 'Não autenticado. Faça login na área secreta.',
    noAccess: 'Sem acesso a este encontro.',
    sessionNotLive: 'Este encontro ainda não está aberto.',
    sessionEnded: 'Este encontro foi encerrado.',
    roomFull: 'Esta sala está cheia. Escolha outra ou aguarde.',
    generic: 'Algo deu errado. Tente novamente.',
  },
} as const
