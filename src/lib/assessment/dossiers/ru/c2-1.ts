import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-c2-1",
  language: "ru",
  level: "C2",
  topic: "littérature",
  title: "Непрочитанная классика",
  reading: {
    text: "Есть в литературной жизни особая порода книг, о которых принято говорить с интонацией лёгкого благоговения и которые при этом, как правило, никем не прочитаны. Подобная почтительность ничего не стоит и потому ею щедро разбрасываются. Назовём такую книгу, для удобства, «классической», хотя классика здесь — понятие скорее социальное, нежели эстетическое. Она стоит на полке в гостиной, как семейный портрет дальнего родственника: всем известно, что он был человеком значительным, но никто не помнит, чем именно.\n\nПарадокс в том, что подобная слава на редкость прочна. Невозможно разочароваться в книге, которую не читают, а потому она застрахована от самого опасного врага любой репутации — от живого читателя. Тот, кто всё-таки решается открыть том, обнаруживает, как правило, нечто совсем иное, чем обещала молва: либо текст оказывается куда смешнее и злее, чем полагалось бы памятнику, либо, напротив, скучнее, чем позволяют себе признать восторженные рецензенты. Критик, обязанный высказаться о юбилее такого автора, оказывается в особенно щекотливом положении: хвалить приходится вслепую, а хулить — себе дороже. И тогда начинается самое занятное — неловкое молчание человека, обманутого в лучших ожиданиях и стыдящегося в этом сознаться.\n\nНе следует, впрочем, торопиться с обвинениями. Репутация книги — это своего рода коллективное произведение, и ему, как всякому труду, нельзя отказать в известной изобретательности. Поколения читателей, не удосужившихся дойти до последней страницы, щедро наделили книгу достоинствами, которых сам автор, вероятно, не подозревал; в этом смысле молва оказывается соавтором, причём соавтором куда более снисходительным, чем критика. Любопытно, что наиболее ревностными хранителями славы нередко бывают именно те, кто ближе всего знаком с автором понаслышке: незнание избавляет от сомнений, а сомнения, как известно, плохие союзники юбилейного красноречия. Автор, увы, лишён возможности возразить, и ему остаётся лишь утешаться мыслью, что быть непрочитанным в хорошей компании всё-таки лучше, чем быть прочитанным в плохой.\n\nЧто же из этого следует? Пожалуй, лишь то, что подлинное чтение — занятие почти подпольное: оно не нуждается ни в свидетелях, ни в цитатах для светских бесед. Оно требует времени, терпения и готовности услышать от книги не то, что хотелось бы. Тот, кто на это способен, получает награду, правда, не всегда ту, на которую рассчитывал: порой это просто тихое удивление, с каким узнаёшь в давно умершем авторе собеседника, говорящего о твоих собственных сомнениях.",
    questions: [
      {
        id: "ru-c2-1-r1",
        prompt: "Quel ton l’auteur adopte-t-il envers les livres « classiques » que personne ne lit, et par quels procédés ?",
        referenceAnswer: "Un ton ironique : il compare le livre au portrait d’un lointain parent dont nul ne sait ce qu’il a fait, et souligne qu’une révérence qui ne coûte rien est distribuée sans compter.",
        expectedPoints: ["ironie", "comparaison avec le portrait d’un parent éloigné", "respect de façade, sans lecture"],
      },
      {
        id: "ru-c2-1-r2",
        prompt: "Que signifie l’idée que la réputation d’un livre est une œuvre collective dont la rumeur est coauteur ?",
        referenceAnswer: "Que des lecteurs qui n’ont pas lu le livre lui ont prêté des qualités que l’auteur n’avait peut-être pas prévues, la rumeur se montrant plus indulgente que la critique.",
        expectedPoints: ["la réputation est construite par des non-lecteurs", "qualités que l’auteur n’avait pas prévues", "la rumeur est plus indulgente que la critique"],
      },
      {
        id: "ru-c2-1-r3",
        prompt: "Quelle conception de la lecture véritable se dégage de la fin du texte ?",
        referenceAnswer: "Une activité presque clandestine, sans témoins ni citations de salon, qui exige du temps et de la patience et peut procurer un discret étonnement : retrouver chez un auteur mort un interlocuteur qui parle de nos propres doutes.",
        expectedPoints: ["lecture presque clandestine", "demande temps, patience, ouverture", "rencontre avec un interlocuteur qui parle de nos doutes"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "BBotskuyw_M",
      title: "Пушкин: наше все?",
      channel: "Tamara Eidelman",
      start: 221,
      end: 345,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-c2-1-l1",
        prompt: "Qu’est-ce qui surprend les deux enseignantes néerlandaises chez les participants russes, et qu’est-ce que cela révèle ?",
        referenceAnswer: "Dès qu’on nomme Tsarskoïe Selo, les Russes récitent ensemble un vers de Pouchkine ; les Néerlandaises connaissent très peu de poèmes par cœur (l’une seulement parce qu’on la punissait ainsi à l’école). Cela montre la place de Pouchkine et de la récitation dans l’éducation russe.",
        expectedPoints: ["les Russes récitent spontanément Pouchkine ensemble", "les Néerlandaises savent peu de poèmes par cœur", "la place de Pouchkine dans l’éducation russe"],
      },
      {
        id: "ru-c2-1-l2",
        prompt: "Comment la conférencière amène-t-elle la surprise de l’opéra « Mozart et Salieri », et sur quel ton ?",
        referenceAnswer: "Elle demande malicieusement qui a écrit le texte, comme un jeu de devinette ; la réponse est encore Pouchkine. Le ton est amusé, ironique.",
        expectedPoints: ["elle demande qui a écrit le texte", "c’est encore Pouchkine", "ton amusé / ironique"],
      },
      {
        id: "ru-c2-1-l3",
        prompt: "Que pense-t-elle de la question « Is there anybody else in Russian culture except Pushkin? » ?",
        referenceAnswer: "Elle la trouve formidable et l’apprécie ; elle répond qu’il y a bien sûr beaucoup d’autres auteurs, tout en reconnaissant que le rôle de Pouchkine est immense.",
        expectedPoints: ["elle trouve la phrase formidable", "il y a beaucoup d’autres auteurs", "le rôle de Pouchkine est immense"],
      },
    ],
  },
  writing: {
    prompt: "Écris six phrases en russe : dis s’il vaut mieux connaître un grand livre par sa réputation ou le lire soi-même, en nuançant ton avis et, si tu le souhaites, avec une pointe d’ironie.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
