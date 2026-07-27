ALTER TABLE evaluations
    ADD COLUMN commit_count INT,
    ADD COLUMN interaction_count INT,
    ADD COLUMN avg_response_time_ms INT,
    ADD COLUMN median_response_time_ms INT,
    ADD COLUMN activity_summary TEXT;
