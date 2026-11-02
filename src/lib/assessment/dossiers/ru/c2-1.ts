import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-c2-1",
  language: "ru",
  level: "C2",
  topic: "littérature",
  title: "Непрочитанная классика",
  reading: {
    text: "Есть в литературной жизни особая порода книг, о которых принято говорить с интонацией лёгкого благоговения и которые при этом, как правило, никем не прочитаны. Подобная почтительность ничего не стоит и потому раздаётся щедро. Назовём такую книгу, для удобства, «классической», хотя классика здесь — понятие скорее социальное, нежели эстетическое. Она стоит на полке в гостиной, как семейный портрет дальнего родственника: всем известно, что он был человеком значительным, но никто не помнит, чем именно.\n\nПарадокс в том, что подобная слава на редкость прочна. Невозможно разочароваться в книге, которую не читают, а потому она застрахована от самого опасного врага любой репутации — от живого читателя. Тот, кто всё-таки решается открыть том, обнаруживает, как правило, нечто совсем иное, чем обещала молва: либо текст оказывается куда смешнее и злее, чем полагалось бы памятнику, либо, напротив, скучнее, чем позволяют себе признать восторженные рецензенты. Критик, обязанный высказаться о юбилее такого автора, оказывается в особенно щекотливом положении: хвалить приходится вслепую, а хулить — себе дороже. И тогда начинается самое занятное — неловкое молчание человека, обманутого в лучших ожиданиях и стыдящегося в этом сознаться.\n\nНе следует, впрочем, торопиться с обвинениями. Репутация книги — это своего рода коллективное произведение, и ему, как всякому труду, нельзя отказать в известной изобретательности. Поколения читателей, не удосужившихся дойти до последней страницы, щедро наделили книгу достоинствами, которых сам автор, вероятно, не подозревал; в этом смысле молва оказывается соавтором, причём соавтором куда более снисходительным, чем критика. Любопытно, что наиболее ревностными хранителями славы нередко бывают именно те, кто ближе всего знаком с автором понаслышке: незнание избавляет от сомнений, а сомнения, как известно, плохие союзники юбилейного красноречия. Автор, увы, лишён возможности возразить, и ему остаётся лишь утешаться мыслью, что быть непрочитанным в хорошей компании всё-таки лучше, чем быть прочитанным в плохой.\n\nЧто же из этого следует? Пожалуй, лишь то, что подлинное чтение — занятие почти подпольное: оно не нуждается ни в свидетелях, ни в цитатах для светских бесед. Оно требует времени, терпения и готовности услышать от книги не то, что хотелось бы. Тот, кто на это способен, получает награду, правда, не всегда ту, на которую рассчитывал: порой это просто тихое удивление, с каким узнаёшь в давно умершем авторе собеседника, говорящего о твоих собственных сомнениях.",
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
    script: "Мне вспоминается один знакомый, человек остроумный и начитанный, по крайней мере на словах. Он однажды признался, что за всю жизнь так и не дочитал ни одного романа из тех, которыми принято гордиться, — и добавил, что нисколько об этом не жалеет. «Зачем, — говорил он, — читать то, что я и без того прекрасно знаю по чужим пересказам?» Мы посмеялись, но потом я поймал себя на мысли, что в его шутке есть горькая правда. Ведь мы действительно привыкли довольствоваться отражением вместо оригинала, и отражение, надо признать, часто бывает лестнее. Оригинал же способен возразить, смутить, а то и вовсе оскорбить. Быть может, поэтому так немногие решаются с ним встретиться. Не скрою, эта встреча иногда обходится дороже, чем хотелось бы. И всё-таки, если однажды вы возьмёте с полки пыльный том и дочитаете его до конца, вы, возможно, обнаружите, что скучали не по книге, а по самому себе — тому, кто умел слушать.",
    questions: [
      {
        id: "ru-c2-1-l1",
        prompt: "Que révèle, selon le locuteur, la plaisanterie de son ami sur les romans célèbres ?",
        referenceAnswer: "Une amère vérité : on se contente de résumés et de reflets des grandes œuvres plutôt que de les lire, en se persuadant de les connaître.",
        expectedPoints: ["l’ami n’a lu aucun roman célèbre et ne le regrette pas", "on se contente de reflets et de résumés"],
      },
      {
        id: "ru-c2-1-l2",
        prompt: "Pourquoi, d’après le locuteur, si peu de gens osent-ils rencontrer l’original ?",
        referenceAnswer: "Parce que l’original peut contredire, troubler, voire offenser, alors que son reflet est plus flatteur.",
        expectedPoints: ["l’original dérange, contredit ou offense", "le reflet est plus flatteur"],
      },
      {
        id: "ru-c2-1-l3",
        prompt: "Que suggère la dernière phrase sur ce que l’on cherche vraiment dans un livre ?",
        referenceAnswer: "Que ce qui nous manquait n’était pas tant le livre que nous-mêmes, la personne que nous étions quand nous savions écouter.",
        expectedPoints: ["nostalgie de soi plus que du livre", "capacité d’écoute perdue"],
      },
    ],
  },
  writing: {
    prompt: "Écrivez six phrases en russe : dites s’il vaut mieux connaître un grand livre par sa réputation ou le lire soi-même, en nuançant votre avis et, si vous le souhaitez, avec une pointe d’ironie.",
  },
  audio: null,
  reviewedOn: null,
};
