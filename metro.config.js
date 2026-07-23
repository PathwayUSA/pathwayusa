const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prefer CJS over ESM to avoid Hermes dynamic-import issues in packages like @supabase/supabase-js
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Disable package exports resolution so Metro falls back to resolverMainFields
// (package exports on @supabase/supabase-js points to ESM which has a dynamic import Hermes can't handle)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
