module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NE PAS ajouter react-native-reanimated/plugin ici :
    // babel-preset-expo ~57.x l'inclut automatiquement pour reanimated v4
  };
};
