-- DB 장애 등 파일과 무관한 분석 실패를 mapping_failed 대신 internal_error로 기록한다.
alter table public.analyses drop constraint analyses_error_code_check;
alter table public.analyses add constraint analyses_error_code_check check (error_code in (
  'not_transactions', 'mapping_failed', 'too_many_invalid_rows', 'file_unreadable',
  'file_encrypted', 'llm_unavailable', 'timeout', 'too_many_rows',
  'unsupported_encoding', 'unsupported_currency', 'storage_upload_failed', 'internal_error'
));
