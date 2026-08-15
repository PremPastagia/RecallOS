-- Insert default user profile for local dev
INSERT INTO profiles (id) VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING;

-- Seed Knowledge Items
INSERT INTO knowledge_items (id, user_id, title, summary, full_content) VALUES 
('k_1001', '00000000-0000-0000-0000-000000000000', 'GARCH Model', 'A statistical model used in econometrics to estimate the volatility of financial returns.', 'Generalized AutoRegressive Conditional Heteroskedasticity (GARCH) is a statistical model used in analyzing time-series data where the variance error is believed to be serially autocorrelated. It is primarily used to model financial time series that exhibit time-varying volatility and volatility clustering.'),
('k_1002', '00000000-0000-0000-0000-000000000000', 'First Principles Thinking', 'A problem-solving approach that involves breaking down a problem into its fundamental truths.', 'First principles thinking is the act of boiling a process down to the fundamental parts that you know are true and building up from there. It is one of the most effective strategies you can employ for dealing with complicated problems and generating original solutions. It also removes the impurity of assumptions and conventions.'),
('k_1003', '00000000-0000-0000-0000-000000000000', 'Bullwhip Effect', 'A supply chain phenomenon where small fluctuations in retail demand cause progressively larger fluctuations in wholesale, distributor, and manufacturer demand.', 'The bullwhip effect occurs when the demand for a product changes, and those changes are amplified as they move further up the supply chain. This leads to inefficient production, excessive inventory, and higher costs.'),
('k_1004', '00000000-0000-0000-0000-000000000000', 'Pareidolia', 'The psychological tendency to perceive a specific, often meaningful image in a random or ambiguous visual pattern.', 'Pareidolia is a type of apophenia, which is a more generalized term for seeing patterns in random data. The most common form of pareidolia is seeing faces in inanimate objects, such as clouds, rocks, or toast.'),
('k_1005', '00000000-0000-0000-0000-000000000000', 'Spaced Repetition', 'An evidence-based learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.', 'Spaced repetition leverages the spacing effect, which asserts that learning is greater when studying is spread out over time. It is highly effective for vocabulary acquisition, law, medicine, and other fields requiring significant memorization.')
ON CONFLICT DO NOTHING;

-- Seed Review States
INSERT INTO review_states (item_id, next_review_date, strength, interval, ease_factor) VALUES 
('k_1001', NOW() - INTERVAL '1 day', 0, 1, 2.5),
('k_1002', NOW() - INTERVAL '2 days', 1, 3, 2.6),
('k_1003', NOW() + INTERVAL '1 day', 2, 7, 2.7),
('k_1004', NOW() + INTERVAL '2 days', 3, 14, 2.8),
('k_1005', NOW() - INTERVAL '3 days', 0, 1, 2.5)
ON CONFLICT DO NOTHING;

-- Seed Related Concepts
INSERT INTO related_concepts (source_item_id, target_item_id) VALUES 
('k_1001', 'k_1003'),
('k_1001', 'k_1004'),
('k_1002', 'k_1005'),
('k_1002', 'k_1004'),
('k_1002', 'k_1001')
ON CONFLICT DO NOTHING;

