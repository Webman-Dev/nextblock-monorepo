-- Create package_activations table
CREATE TABLE IF NOT EXISTS package_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    package_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    meta JSONB DEFAULT '{}'::jsonb,
    last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(license_key, package_id)
);

-- Enable RLS
ALTER TABLE package_activations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_activations_package_id ON package_activations(package_id);
CREATE INDEX IF NOT EXISTS idx_package_activations_license_key ON package_activations(license_key);

-- PERMISSIONS
-- Explicitly grant access to roles to prevent "permission denied" errors
GRANT ALL ON TABLE package_activations TO service_role;
GRANT ALL ON TABLE package_activations TO postgres;
GRANT ALL ON TABLE package_activations TO anon;
GRANT ALL ON TABLE package_activations TO authenticated;

-- RLS POLICIES

-- 1. Service Role: Full Access
-- Allows server actions to manage activations securely
CREATE POLICY "Allow service role full access" ON package_activations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Authenticated Users: Read Only
-- Allows the CMS UI to display active packages
CREATE POLICY "Allow authenticated read access" ON package_activations
    FOR SELECT
    TO authenticated
    USING (true);
