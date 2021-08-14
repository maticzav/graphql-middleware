export const config: import('bob-esbuild').BobConfig = {
  tsc: {
    dirs: ['.'],
  },
  distDir: 'dist',
  verbose: true,
  singleBuild: true,
}
