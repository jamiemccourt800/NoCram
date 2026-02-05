const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = function override(config, env) {
  if (env === 'production') {
    // Find the existing Workbox plugin in the Create React App config
    const workboxPlugin = config.plugins.find(
      (plugin) => plugin.constructor.name === 'GenerateSW'
    );

    if (workboxPlugin) {
      // Remove the default GenerateSW plugin
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'GenerateSW'
      );
    }

    // Add InjectManifest plugin to use our custom service worker
    config.plugins.push(
      new InjectManifest({
        swSrc: './src/service-worker.js',
        swDest: 'service-worker.js',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      })
    );
  }

  return config;
};
