ALTER TABLE evaluations
    DROP COLUMN consult_input_perspective_score,
    DROP COLUMN consult_prompt_efficiency_score,
    DROP COLUMN consult_technical_depth_score,
    DROP COLUMN consult_validation_maturity_score,
    DROP COLUMN consult_token_efficiency_score,
    ADD COLUMN consult_categories JSONB;
