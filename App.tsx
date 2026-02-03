// Re-export from mobile package for expo's default entry point
// This is needed because expo is hoisted to root node_modules in workspaces
export { default } from './packages/mobile/App';
