ALTER TABLE evaluations
    DROP COLUMN prompt_quality_score,
    DROP COLUMN efficiency_score,
    DROP COLUMN context_usage_score,
    DROP COLUMN validation_score,
    DROP COLUMN collaboration_score,
    DROP COLUMN total_score,
    DROP COLUMN strengths,
    DROP COLUMN weaknesses,
    ADD COLUMN interaction_log_analysis TEXT,
    ADD COLUMN agent_usage_analysis TEXT,
    ADD COLUMN context_interpretation TEXT;
