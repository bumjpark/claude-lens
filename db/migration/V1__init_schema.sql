-- USER
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    experience_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROJECT
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    language VARCHAR(100),
    framework VARCHAR(100),
    project_size VARCHAR(20),
    dev_environment VARCHAR(100),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TASK
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    task_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'in_progress',
    total_prompts INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    commit_count INT DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROMPT_ANALYSIS
CREATE TABLE prompt_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    prompt_type VARCHAR(50),
    context_score INT,
    clarity_score INT,
    constraint_score INT,
    goal_score INT,
    total_quality_score INT,
    evidence TEXT,
    analyzed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- EVALUATION
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    maturity_level VARCHAR(20) NOT NULL,
    prompt_quality_score INT,
    efficiency_score INT,
    context_usage_score INT,
    validation_score INT,
    collaboration_score INT,
    total_score INT,
    grade VARCHAR(5),
    strengths JSONB,
    weaknesses JSONB,
    evaluated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RECOMMENDATION
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id),
    category VARCHAR(50),
    priority VARCHAR(10),
    problem TEXT,
    evidence TEXT,
    suggestion TEXT,
    example_prompt TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- REPORT
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id),
    report_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'generating',
    summary JSONB,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
