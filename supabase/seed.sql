-- Demo seed, applied by `npm run db:reset` (supabase db reset).
-- Equivalent to the in-code demo data of phase 1 (src/lib/data/mock/*), relative to the
-- day the database is reset: today's mission is pending, 24 earlier days were studied.
-- Run `npm run db:reset` again on another day to get a mission for that day.
--
-- Demo account (local development ONLY, never create it on a hosted project):
--   email:    demo@dailylingua.test
--   password: demo-password-123

do $seed$
declare
  demo_id constant uuid := '11111111-1111-4111-8111-111111111111';
  today constant date := (now() at time zone 'Europe/Paris')::date;
  -- Days before today on which the demo user studied.
  studied constant int[] := array[1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 16, 17, 19, 20, 21, 22, 24, 26, 27, 28, 30, 31];
  -- Completed minutes of the first six past missions (cycled afterwards). Each mission has
  -- 10 + 5 min per language; anything below 30 leaves Italian steps unfinished (see below).
  spent constant int[] := array[30, 25, 30, 20, 30, 15];

  -- Three past mission "templates" (ru + it), cycled over the studied days.
  past constant jsonb := $json$
  [
    [
      {"language": "ru", "type": "podcast", "source": "Arzamas", "difficulty": "C1", "minutes": 25,
       "title": "Как читать Платонова: язык, который сопротивляется",
       "url": "https://arzamas.academy", "score": [3, 3], "topics": ["littérature", "culture"]},
      {"language": "it", "type": "article", "source": "Il Post", "difficulty": "B2", "minutes": 6,
       "title": "Le città italiane che si svuotano",
       "url": "https://www.ilpost.it", "score": [2, 3], "topics": ["société"]}
    ],
    [
      {"language": "ru", "type": "video", "source": "ПостНаука", "difficulty": "C1", "minutes": 12,
       "title": "Почему мы так плохо запоминаем лица",
       "url": "https://postnauka.org/video", "score": [2, 3], "topics": ["sciences"]},
      {"language": "it", "type": "interview", "source": "Rai Radio 3", "difficulty": "B2", "minutes": 10,
       "title": "Intervista: il mestiere del doppiatore",
       "url": "https://www.raiplaysound.it", "score": null, "topics": ["cinéma", "culture"]}
    ],
    [
      {"language": "ru", "type": "article", "source": "Медуза", "difficulty": "B2", "minutes": 9,
       "title": "Сибирские города: жизнь после заводов",
       "url": "https://meduza.io", "score": [3, 4], "topics": ["société", "économie"]},
      {"language": "it", "type": "article", "source": "Focus", "difficulty": "B2", "minutes": 5,
       "title": "Che cosa mangiavano gli antichi romani",
       "url": "https://www.focus.it", "score": [3, 3], "topics": ["histoire", "gastronomie"]}
    ]
  ]
  $json$::jsonb;

  -- Today's mission: the exact content of src/lib/data/mock/mission.ts.
  today_sessions constant jsonb := $json$
  [
    {
      "language": "ru",
      "content": {
        "title": "Городская акустика: как шум меняет пение птиц",
        "type": "article",
        "language": "ru",
        "source": {
          "name": "ПостНаука",
          "homepage": "https://postnauka.org"
        },
        "url": "https://postnauka.org",
        "topics": ["sciences"],
        "difficulty": "C1",
        "durationMinutes": 8,
        "summary": "Un article de vulgarisation sur l'adaptation des oiseaux urbains au bruit : chants plus aigus, horaires décalés, et ce que les confinements de 2020 ont permis d'observer.",
        "transcriptAvailable": true
      },
      "activities": [
        {
          "id": "ru-read",
          "kind": "reading",
          "title": "Lire l'article",
          "estimatedMinutes": 8
        },
        {
          "id": "ru-quiz",
          "kind": "comprehension",
          "title": "Questions de compréhension",
          "estimatedMinutes": 5
        },
        {
          "id": "ru-vocab",
          "kind": "vocabulary",
          "title": "Cinq expressions à retenir",
          "estimatedMinutes": 3
        },
        {
          "id": "ru-write",
          "kind": "writing",
          "title": "Écrire un court paragraphe",
          "estimatedMinutes": 4
        }
      ],
      "questions": [
        {
          "id": "ru-q1",
          "prompt": "Почему городские птицы поют выше, чем их лесные сородичи?",
          "options": [
            "Чтобы их не заглушал низкочастотный шум транспорта",
            "Потому что в городе в среднем теплее",
            "Из-за круглосуточного искусственного освещения"
          ],
          "answerIndex": 0,
          "explanation": "Le bruit routier occupe surtout les basses fréquences : un chant plus aigu reste audible."
        },
        {
          "id": "ru-q2",
          "prompt": "Что заметили исследователи во время локдауна 2020 года?",
          "options": [
            "Птицы перестали петь по утрам",
            "Птицы стали петь тише, а их песни — богаче",
            "Птицы массово покинули города"
          ],
          "answerIndex": 1,
          "explanation": "Avec moins de bruit, les oiseaux n'avaient plus besoin de « crier » : chants plus doux et plus variés."
        },
        {
          "id": "ru-q3",
          "prompt": "Как автор понимает выражение «не в последнюю очередь» в последнем абзаце?",
          "options": [
            "В конце концов",
            "В значительной степени, в том числе",
            "Ни в коем случае"
          ],
          "answerIndex": 1,
          "explanation": "« Не в последнюю очередь » = notamment, pour une bonne part. Un marqueur très fréquent à l'écrit (C1)."
        }
      ],
      "expressions": [
        {
          "id": "ru-e1",
          "text": "приспоса́бливаться к чему́-либо",
          "translation": "s'adapter à qqch",
          "example": "Птицы приспосабливаются к городскому шуму быстрее, чем считалось.",
          "note": "Perfectif : приспособиться"
        },
        {
          "id": "ru-e2",
          "text": "в ра́зы",
          "translation": "plusieurs fois (plus / moins)",
          "example": "Ночью уровень шума в разы ниже."
        },
        {
          "id": "ru-e3",
          "text": "своди́ться к чему́-либо",
          "translation": "se résumer à, se ramener à",
          "example": "Проблема не сводится к одному только шуму."
        },
        {
          "id": "ru-e4",
          "text": "не в после́днюю о́чередь",
          "translation": "notamment, en bonne partie",
          "example": "Это произошло не в последнюю очередь благодаря локдауну."
        },
        {
          "id": "ru-e5",
          "text": "бить трево́гу",
          "translation": "tirer la sonnette d'alarme",
          "example": "Орнитологи бьют тревогу уже не первый год."
        }
      ],
      "production": {
        "mode": "writing",
        "prompt": "Как шум в вашем городе влияет на вашу повседневную жизнь? Напишите короткий текст и используйте минимум три выражения из урока.",
        "targetLength": "120–150 слов",
        "hints": [
          "Commence par une situation concrète (le matin, les transports…)",
          "Utilise un connecteur de C1 : впрочем, тем не менее, иными словами",
          "Termine par une proposition ou une opinion personnelle"
        ]
      }
    },
    {
      "language": "it",
      "content": {
        "title": "La pausa caffè, un rito che cambia",
        "type": "podcast",
        "language": "it",
        "source": {
          "name": "Il Post",
          "homepage": "https://www.ilpost.it/podcasts/"
        },
        "url": "https://www.ilpost.it/podcasts/",
        "topics": ["société", "gastronomie"],
        "difficulty": "B2",
        "durationMinutes": 4,
        "summary": "Un court épisode sur l'évolution du café au bar en Italie : prix, habitudes, et ce que le rituel dit du quotidien.",
        "transcriptAvailable": false
      },
      "activities": [
        {
          "id": "it-listen",
          "kind": "listening",
          "title": "Écouter l'extrait (4 min)",
          "estimatedMinutes": 4
        },
        {
          "id": "it-vocab",
          "kind": "vocabulary",
          "title": "Expressions du quotidien",
          "estimatedMinutes": 2
        },
        {
          "id": "it-speak",
          "kind": "writing",
          "title": "Écrire puis dire à voix haute",
          "estimatedMinutes": 4
        }
      ],
      "questions": [],
      "expressions": [
        {
          "id": "it-e1",
          "text": "fare due chiacchiere",
          "translation": "bavarder un peu",
          "example": "Al bar ci fermiamo sempre a fare due chiacchiere."
        },
        {
          "id": "it-e2",
          "text": "al volo",
          "translation": "en vitesse, sur le pouce",
          "example": "Prendo un caffè al volo e scappo in ufficio."
        },
        {
          "id": "it-e3",
          "text": "mica male",
          "translation": "pas mal du tout",
          "example": "Un espresso a un euro e venti? Mica male."
        },
        {
          "id": "it-e4",
          "text": "fare un salto",
          "translation": "faire un saut, passer (quelque part)",
          "example": "Faccio un salto al bar prima della riunione."
        }
      ],
      "production": {
        "mode": "spoken",
        "prompt": "Scrivi quello che diresti a un amico per raccontargli la tua routine del mattino, poi dillo ad alta voce. Usa almeno tre espressioni della lezione.",
        "targetLength": "30–50 mots",
        "hints": [
          "Écris comme tu parlerais : des phrases courtes, faciles à dire",
          "Si un mot manque, contourne-le (« quella cosa che… »)",
          "Garde des mots et des tournures que tu sais prononcer"
        ]
      }
    }
  ]
  $json$::jsonb;

  past_content_ids uuid[] := '{}';
  s jsonb;
  v record;
  cid uuid;
  lid uuid;
  mid uuid;
  sid uuid;
  aid uuid;
  gen timestamptz;
  tpl int;
  mins int;
  total int;
  correct int;
begin
  -- Demo user (GoTrue-compatible row; the profile is created by the signup trigger).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
    'demo@dailylingua.test', extensions.crypt('demo-password-123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), demo_id,
    jsonb_build_object('sub', demo_id::text, 'email', 'demo@dailylingua.test', 'email_verified', true),
    'email', demo_id::text, now(), now(), now()
  );

  update public.profiles set
    daily_minutes = 30,
    topics = array['société', 'culture', 'histoire', 'sciences', 'cinéma'],
    content_types = array['article', 'podcast', 'interview'],
    difficulty = 'matched',
    generation_time = '07:00',
    time_zone = 'Europe/Paris'
  where id = demo_id;

  insert into public.user_languages (
    user_id, language, level, target_level, focus, weight, days, purpose, topics, content_types
  ) values
    (demo_id, 'ru', 'B2', 'C1', 'Compréhension fine, registre soutenu, connecteurs écrits', 20, '{1,2,3,4,5,6,7}', 'general',
     array['société', 'culture', 'histoire', 'sciences', 'cinéma'], array['article', 'podcast', 'interview']),
    (demo_id, 'it', 'B1', 'B2', 'Vocabulaire actif, expression orale, spontanéité', 10, '{1,3,5}', 'conversational',
     array['société', 'culture', 'histoire', 'sciences', 'cinéma'], array['article', 'podcast', 'interview']);

  insert into public.sources (name, homepage_url) values
    ('Arzamas', 'https://arzamas.academy'),
    ('ПостНаука', 'https://postnauka.org'),
    ('Il Post', 'https://www.ilpost.it'),
    ('Rai Radio 3', 'https://www.raiplaysound.it'),
    ('Медуза', 'https://meduza.io'),
    ('Focus', 'https://www.focus.it');

  -- Shared contents of the three past mission templates (6 rows, reused every cycle).
  for tpl in 0..2 loop
    for i in 0..1 loop
      s := past -> tpl -> i;
      insert into public.contents (
        source_id, language, content_type, title, url, difficulty, duration_minutes, summary, transcript_available, topics
      )
      select src.id, s ->> 'language', s ->> 'type', s ->> 'title', s ->> 'url', s ->> 'difficulty',
             (s ->> 'minutes')::int, 'Contenu de démonstration (titre inventé).', true,
             array(select jsonb_array_elements_text(s -> 'topics'))
      from public.sources src where src.name = s ->> 'source'
      returning id into cid;
      past_content_ids := past_content_ids || cid;
    end loop;
  end loop;

  -- Past missions. Missing minutes (30 - mins) are Italian steps left unfinished:
  -- 5 = vocabulary (5 min), 10 = discovery (10 min), 15 = both.
  for n in 1..array_length(studied, 1) loop
    tpl := (n - 1) % 3;
    mins := spent[(n - 1) % 6 + 1];
    gen := ((today - studied[n])::timestamp + time '07:00') at time zone 'Europe/Paris';
    insert into public.missions (
      user_id, mission_date, budget_minutes, status, generated_at, started_at, completed_at
    ) values (
      demo_id, today - studied[n], 30, 'ready', gen, gen + interval '1 hour', gen + interval '2 hours'
    ) returning id into mid;

    for i in 0..1 loop
      s := past -> tpl -> i;
      total := case when jsonb_typeof(s -> 'score') = 'array' then (s -> 'score' ->> 1)::int else 0 end;
      correct := case when jsonb_typeof(s -> 'score') = 'array' then (s -> 'score' ->> 0)::int else 0 end;
      insert into public.mission_sessions (
        mission_id, user_id, position, language, content_id, questions, expressions, production
      ) values (
        mid, demo_id, i, s ->> 'language', past_content_ids[tpl * 2 + i + 1],
        (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', 'q' || q, 'prompt', 'Question de démonstration ' || q,
            'options', jsonb_build_array('Réponse A', 'Réponse B'),
            'answerIndex', 0, 'explanation', 'Donnée de démonstration.'
          )), '[]'::jsonb)
          from generate_series(1, total) as q
        ),
        '[]'::jsonb,
        jsonb_build_object(
          'mode', case when s ->> 'language' = 'ru' then 'writing' else 'spoken' end,
          'prompt', 'Tâche de démonstration.', 'hints', '[]'::jsonb
        )
      ) returning id into sid;

      for k in 0..1 loop
        insert into public.mission_activities (session_id, user_id, position, kind, title, estimated_minutes)
        values (
          sid, demo_id, k,
          case when k = 1 then 'vocabulary'
               when s ->> 'type' = 'article' then 'reading'
               when s ->> 'type' = 'video' then 'watching'
               else 'listening' end,
          case when k = 1 then 'Expressions à retenir' else 'Découvrir le contenu' end,
          case when k = 1 then 5 else 10 end
        ) returning id into aid;
        if i = 1 and ((k = 1 and 30 - mins in (5, 15)) or (k = 0 and 30 - mins in (10, 15))) then
          insert into public.activity_progress (activity_id, user_id, completed_at)
          values (aid, demo_id, null);
        else
          insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds)
          values (aid, demo_id, gen + interval '90 minutes', (case when k = 1 then 5 else 10 end) * 60);
        end if;
      end loop;

      -- Graded by the quiz_answers trigger: the first `correct` answers pick option 0.
      for q in 1..total loop
        insert into public.quiz_answers (session_id, user_id, question_id, selected_index, answered_at)
        values (sid, demo_id, 'q' || q, case when q <= correct then 0 else 1 end, gen + interval '80 minutes');
      end loop;
    end loop;
  end loop;

  -- Today's mission, pending.
  insert into public.missions (user_id, mission_date, budget_minutes, status, generated_at)
  values (demo_id, today, 30, 'ready', now())
  returning id into mid;

  for s in select value from jsonb_array_elements(today_sessions) loop
    insert into public.contents (
      source_id, language, content_type, title, url, difficulty, duration_minutes, summary, transcript_available, topics
    )
    select src.id, s ->> 'language', s -> 'content' ->> 'type', s -> 'content' ->> 'title',
           s -> 'content' ->> 'url', s -> 'content' ->> 'difficulty',
           (s -> 'content' ->> 'durationMinutes')::int, s -> 'content' ->> 'summary',
           (s -> 'content' ->> 'transcriptAvailable')::boolean,
           array(select jsonb_array_elements_text(s -> 'content' -> 'topics'))
    from public.sources src where src.name = s -> 'content' -> 'source' ->> 'name'
    returning id into cid;

    insert into public.mission_sessions (
      mission_id, user_id, position, language, content_id, questions, expressions, production
    ) values (
      mid, demo_id, (select count(*) from public.mission_sessions where mission_id = mid),
      s ->> 'language', cid, s -> 'questions', s -> 'expressions', s -> 'production'
    ) returning id into sid;

    insert into public.mission_activities (session_id, user_id, position, kind, title, estimated_minutes)
    select sid, demo_id, (act.n - 1)::int, act.value ->> 'kind', act.value ->> 'title',
           (act.value ->> 'estimatedMinutes')::int
    from jsonb_array_elements(s -> 'activities') with ordinality as act(value, n);
  end loop;

  insert into public.vocabulary_lists (user_id, language, name, description)
  values (demo_id, 'it', 'Expressions du cours', 'Les tournures vues en cours du jeudi.')
  returning id into lid;

  -- Vocabulary, with a review journal whose last entry matches the current state.
  for v in
    select * from (values
      ('ru', 'впро́чем', 'd''ailleurs, du reste', 'Вводное слово, уточняющее или слегка опровергающее сказанное.', 'Впрочем, это уже совсем другая история.', 'Arzamas', 'https://arzamas.academy', 'learning', 2, -1, 12, 4),
      ('ru', 'закономе́рность', 'régularité, loi (tendance)', 'Устойчивая, повторяющаяся связь между явлениями.', 'Исследователи выявили любопытную закономерность.', 'ПостНаука', 'https://postnauka.org', 'learning', 1, 0, 3, 2),
      ('it', 'sbrigarsi', 'se dépêcher', null, 'Sbrigati, il treno parte tra cinque minuti!', 'Rai Radio 3', 'https://www.raiplaysound.it', 'learning', 1, 0, 4, 1),
      ('ru', 'из ря́да вон выходя́щий', 'hors du commun', null, 'Случай, конечно, из ряда вон выходящий.', null, null, 'learning', 0, 0, 1, 0),
      ('it', 'darsi da fare', 'se démener, se donner du mal', null, 'Si è data da fare per organizzare tutto.', 'Il Post', 'https://www.ilpost.it', 'learning', 2, 1, 9, 3),
      ('ru', 'сплошь и ря́дом', 'à tout bout de champ, très souvent', null, 'Такие ошибки встречаются сплошь и рядом.', 'Медуза', 'https://meduza.io', 'learning', 3, 3, 20, 5),
      ('it', 'a malapena', 'à peine', null, 'Lo conosco a malapena.', null, null, 'learning', 3, 6, 18, 4),
      ('ru', 'тем не ме́нее', 'néanmoins', null, 'Тем не менее, проект решили продолжить.', null, null, 'known', 5, 25, 40, 8),
      ('it', 'in bocca al lupo', 'bonne chance (« merde »)', null, 'Domani hai l''esame? In bocca al lupo!', null, null, 'known', 6, 50, 60, 9),
      ('ru', 'по большо́му счёту', 'au fond, globalement', null, 'По большому счёту, ничего не изменилось.', null, null, 'known', 5, 14, 35, 7),
      ('it', 'mettercela tutta', 'y mettre tout son cœur', null, 'Ce l''ha messa tutta per finire in tempo.', null, null, 'learning', 1, 2, 2, 1),
      ('it', 'prendere in giro', 'se moquer de, taquiner', null, 'Smettila di prendermi in giro!', null, null, 'learning', 0, 1, 2, 0)
    ) as t(language, term, translation, definition, example, source_name, source_url, status, box, due_in, added_ago, review_count)
  loop
    insert into public.vocabulary_items (
      user_id, language, term, translation, definition, example, source_name, source_url,
      status, box, due_on, last_reviewed_on, review_count, added_on
    ) values (
      demo_id, v.language, v.term, v.translation, v.definition, v.example, v.source_name, v.source_url,
      v.status, v.box, today + v.due_in, case when v.review_count > 0 then today - 1 end,
      v.review_count, today - v.added_ago
    ) returning id into cid;

    for k in 1..v.review_count loop
      insert into public.vocabulary_reviews (
        user_id, item_id, reviewed_at, reviewed_on, grade, box_before, box_after, due_on_after
      ) values (
        demo_id, cid,
        ((today - 1 - (v.review_count - k) * 3)::timestamp + time '09:00') at time zone 'Europe/Paris',
        today - 1 - (v.review_count - k) * 3,
        'good',
        greatest(v.box - (v.review_count - k) - 1, 0),
        greatest(v.box - (v.review_count - k), 0),
        case when k = v.review_count then today + v.due_in else today + 1 - (v.review_count - k) * 3 end
      );
    end loop;
  end loop;

  update public.vocabulary_items set list_id = lid
  where user_id = demo_id and language = 'it' and term in ('mettercela tutta', 'prendere in giro');
end
$seed$;
