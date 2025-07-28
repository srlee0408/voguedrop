-- Sample data for testing gallery functionality

-- Insert categories
INSERT INTO "public"."categories" ("name") VALUES 
('Digital Fashion'),
('Street Style'),
('Vintage'),
('Y2K'),
('Minimalist');

-- Insert media assets (make sure these files exist in your storage bucket)
INSERT INTO "public"."media_assets" ("storage_path", "file_name", "media_type") VALUES 
('camera/sample1.jpg', 'sample1', 'image/jpeg'),
('camera/sample2.jpg', 'sample2', 'image/jpeg'),
('camera/sample3.jpg', 'sample3', 'image/jpeg');

-- Insert creations (assuming category IDs 1-5 and media asset IDs 1-3)
INSERT INTO "public"."creations" ("title", "prompt", "category_id", "product_id") VALUES 
('Neon Dreams', 'Futuristic fashion with neon accents', 1, 1),
('Urban Explorer', 'Street style meets high fashion', 2, 2),
('Retro Revival', 'Vintage aesthetics with modern twist', 3, 3);

-- Optional: Insert creation media links for additional media
-- INSERT INTO "public"."creation_media_links" ("creation_id", "media_id") VALUES 
-- (1, 2),
-- (1, 3);