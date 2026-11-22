-- The language enables a single error of the day per learner and language.
-- Rows written before this feature have no language and keep their original shape.
alter table app.error_item add column language text references app.language (code);

create unique index error_item_one_per_day
  on app.error_item (user_id, language, created_day);

create unique index error_item_one_per_correction
  on app.error_item (correction_id) where language is not null;

grant select (language) on app.error_item to authenticated;
